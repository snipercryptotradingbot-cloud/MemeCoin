use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::*;
use crate::state::*;
use super::add_liquidity::LiquidityAction;

pub fn handler(ctx: Context<LiquidityAction>, lp_tokens: u64) -> Result<()> {
    let curve = &mut ctx.accounts.curve;
    require!(curve.status == CurveStatus::Active, BondingCurveError::CurveNotActive);
    require!(lp_tokens > 0, BondingCurveError::InvalidAmounts);

    let user_position = &mut ctx.accounts.user_position;
    require!(user_position.lp_tokens >= lp_tokens, BondingCurveError::InsufficientLpTokens);

    // Calculate proportional withdrawal
    let share = (lp_tokens as u128)
        .checked_mul(10_000)
        .ok_or(BondingCurveError::MathOverflow)?
        .checked_div(curve.total_lp_supply as u128)
        .ok_or(BondingCurveError::MathOverflow)?;

    let sol_out = (curve.sol_reserves as u128)
        .checked_mul(share)
        .ok_or(BondingCurveError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(BondingCurveError::MathOverflow)? as u64;

    let tokens_out = (curve.token_reserves as u128)
        .checked_mul(share)
        .ok_or(BondingCurveError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(BondingCurveError::MathOverflow)? as u64;

    require!(sol_out > 0 || tokens_out > 0, BondingCurveError::NoReserves);

    // Verify vaults have enough
    let sol_vault_lamports = ctx.accounts.sol_vault.lamports();
    let token_vault_amount = ctx.accounts.token_vault.amount;

    require!(
        sol_out <= sol_vault_lamports.saturating_sub(RENT_EXEMPT_RESERVE),
        BondingCurveError::InsufficientSol
    );
    require!(tokens_out <= token_vault_amount, BondingCurveError::TokenVaultInsufficient);

    // Update curve reserves BEFORE transfers
    curve.sol_reserves = curve.sol_reserves.checked_sub(sol_out).ok_or(BondingCurveError::MathOverflow)?;
    curve.token_reserves = curve.token_reserves.checked_sub(tokens_out).ok_or(BondingCurveError::MathOverflow)?;
    curve.total_lp_supply = curve.total_lp_supply.checked_sub(lp_tokens).ok_or(BondingCurveError::MathOverflow)?;

    // Update user position
    user_position.lp_tokens = user_position.lp_tokens.checked_sub(lp_tokens).ok_or(BondingCurveError::MathOverflow)?;
    user_position.sol_deposited = user_position.sol_deposited.checked_sub(sol_out).ok_or(BondingCurveError::MathOverflow)?;
    user_position.tokens_deposited = user_position.tokens_deposited.checked_sub(tokens_out).ok_or(BondingCurveError::MathOverflow)?;

    let mint_key = curve.mint;
    let curve_bump = curve.curve_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        CURVE_SEED,
        mint_key.as_ref(),
        &[curve_bump],
    ]];

    // Transfer SOL from vault to creator via direct lamport manipulation
    if sol_out > 0 {
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += sol_out;
    }

    // Transfer tokens from vault to creator (curve PDA signs)
    if tokens_out > 0 {
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token_interface::TransferChecked {
                    from: ctx.accounts.token_vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.curve.to_account_info(),
                },
                signer_seeds,
            ),
            tokens_out,
            ctx.accounts.mint.decimals,
        )?;
    }

    msg!("Remove liquidity: {} LP -> {} SOL, {} tokens", lp_tokens, sol_out, tokens_out);

    Ok(())
}

const RENT_EXEMPT_RESERVE: u64 = 890880;