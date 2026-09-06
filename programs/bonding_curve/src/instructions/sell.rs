use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use super::buy::SwapTokens;

pub fn handler(ctx: Context<SwapTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
    let curve = &mut ctx.accounts.curve;
    require!(curve.status == CurveStatus::Active, BondingCurveError::CurveNotActive);
    require!(token_amount > 0, BondingCurveError::InvalidAmounts);
    require_keys_eq!(
        ctx.accounts.platform_wallet.key(),
        curve.platform_wallet,
        BondingCurveError::PlatformWalletMismatch
    );

    let sol_vault_lamports = ctx.accounts.sol_vault.lamports();
    let token_vault_amount = ctx.accounts.token_vault.amount;

    require!(
        token_amount <= token_vault_amount,
        BondingCurveError::TokenVaultInsufficient
    );

    // Calculate fee
    let fee = (token_amount as u128)
        .checked_mul(curve.fee_basis_points as u128)
        .ok_or(BondingCurveError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(BondingCurveError::MathOverflow)? as u64;

    let tokens_after_fee = token_amount
        .checked_sub(fee)
        .ok_or(BondingCurveError::MathOverflow)?;

    // Constant product: k = sol_reserves * token_reserves
    let k = (curve.sol_reserves as u128)
        .checked_mul(curve.token_reserves as u128)
        .ok_or(BondingCurveError::MathOverflow)?;

    // sol_out = sol_reserves - (k / (token_reserves + tokens_after_fee))
    let new_token_reserves = curve.token_reserves
        .checked_add(tokens_after_fee)
        .ok_or(BondingCurveError::MathOverflow)?;

    let new_sol_reserves = k
        .checked_div(new_token_reserves as u128)
        .ok_or(BondingCurveError::MathOverflow)? as u64;

    let sol_out = curve.sol_reserves
        .checked_sub(new_sol_reserves)
        .ok_or(BondingCurveError::MathOverflow)?;

    require!(sol_out >= min_sol_out, BondingCurveError::SlippageExceededSol);
    require!(sol_out > 0, BondingCurveError::InsufficientSol);
    require!(
        sol_out <= sol_vault_lamports.saturating_sub(RENT_EXEMPT_RESERVE),
        BondingCurveError::InsufficientSol
    );

    // Update curve state
    curve.sol_reserves = new_sol_reserves;
    curve.token_reserves = new_token_reserves;
    curve.total_swaps = curve.total_swaps.checked_add(1).ok_or(BondingCurveError::MathOverflow)?;

    let sol_vault_bump = curve.sol_vault_bump;
    let curve_address = curve.key();
    // SOL vault is a separate PDA ([SOL_VAULT_SEED, curve]) and must be signed
    // with its own seeds when SOL is paid out of it.
    let vault_signer_seeds: &[&[&[u8]]] = &[&[
        SOL_VAULT_SEED,
        curve_address.as_ref(),
        &[sol_vault_bump],
    ]];

    // Transfer tokens from user to vault (user signs their own transfer)
    token_interface::transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_interface::TransferChecked {
                from: ctx.accounts.user_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        token_amount,
        ctx.accounts.mint.decimals,
    )?;

    // Transfer SOL from vault to user (PDA signs)
    let ix = anchor_lang::system_program::Transfer {
        from: ctx.accounts.sol_vault.to_account_info(),
        to: ctx.accounts.user.to_account_info(),
    };
    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            ix,
            vault_signer_seeds,
        ),
        sol_out,
    )?;

    msg!("Sell: {} tokens -> {} SOL (fee: {} tokens)", token_amount, sol_out, fee);

    Ok(())
}

const RENT_EXEMPT_RESERVE: u64 = 890880;