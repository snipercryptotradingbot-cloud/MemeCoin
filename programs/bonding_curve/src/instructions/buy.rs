use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct SwapTokens<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [CURVE_SEED, mint.key().as_ref()],
        bump = curve.curve_bump,
        has_one = mint,
    )]
    pub curve: Account<'info, BondingCurve>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// SOL vault PDA
    /// CHECK: PDA used only as SOL vault
    #[account(
        mut,
        seeds = [SOL_VAULT_SEED, curve.key().as_ref()],
        bump = curve.sol_vault_bump,
    )]
    pub sol_vault: UncheckedAccount<'info>,

    /// Token vault ATA
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = curve,
        associated_token::token_program = token_program,
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    /// User's token account
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Platform wallet that receives the swap fee
    #[account(mut)]
    /// CHECK: Address is validated against curve state in handler
    pub platform_wallet: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SwapTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
    let curve = &mut ctx.accounts.curve;
    require!(curve.status == CurveStatus::Active, BondingCurveError::CurveNotActive);
    require!(sol_amount > 0, BondingCurveError::InvalidAmounts);
    require_keys_eq!(
        ctx.accounts.platform_wallet.key(),
        curve.platform_wallet,
        BondingCurveError::PlatformWalletMismatch
    );

    let sol_vault_lamports = ctx.accounts.sol_vault.lamports();
    let token_vault_amount = ctx.accounts.token_vault.amount;

    require!(
        sol_amount <= sol_vault_lamports.saturating_sub(RENT_EXEMPT_RESERVE),
        BondingCurveError::InsufficientSol
    );

    // Calculate fee
    let fee = (sol_amount as u128)
        .checked_mul(curve.fee_basis_points as u128)
        .ok_or(BondingCurveError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(BondingCurveError::MathOverflow)? as u64;

    let sol_after_fee = sol_amount
        .checked_sub(fee)
        .ok_or(BondingCurveError::MathOverflow)?;

    // Constant product: k = sol_reserves * token_reserves
    let k = (curve.sol_reserves as u128)
        .checked_mul(curve.token_reserves as u128)
        .ok_or(BondingCurveError::MathOverflow)?;

    // tokens_out = token_reserves - (k / (sol_reserves + sol_after_fee))
    let new_sol_reserves = curve.sol_reserves
        .checked_add(sol_after_fee)
        .ok_or(BondingCurveError::MathOverflow)?;

    let new_token_reserves = k
        .checked_div(new_sol_reserves as u128)
        .ok_or(BondingCurveError::MathOverflow)? as u64;

    let tokens_out = curve.token_reserves
        .checked_sub(new_token_reserves)
        .ok_or(BondingCurveError::MathOverflow)?;

    require!(tokens_out >= min_tokens_out, BondingCurveError::SlippageExceededTokens);
    require!(tokens_out > 0, BondingCurveError::InsufficientTokens);
    require!(tokens_out <= token_vault_amount, BondingCurveError::TokenVaultInsufficient);

    // Update curve state
    curve.sol_reserves = new_sol_reserves;
    curve.token_reserves = new_token_reserves;
    curve.total_swaps = curve.total_swaps.checked_add(1).ok_or(BondingCurveError::MathOverflow)?;

    let mint_key = curve.mint;
    let curve_bump = curve.curve_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        CURVE_SEED,
        mint_key.as_ref(),
        &[curve_bump],
    ]];

    // Transfer SOL from user to vault (including fee)
    let ix = anchor_lang::system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.sol_vault.to_account_info(),
    };
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            ix,
        ),
        sol_amount,
    )?;

    // Transfer fee to platform wallet from vault
    // Direct lamport manipulation — vault is owned by the bonding curve program,
    // so the program can move lamports out of it without going through SystemProgram.
    if fee > 0 {
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.platform_wallet.to_account_info().try_borrow_mut_lamports()? += fee;
    }

    // Transfer tokens from vault to user
    // Token vault ATA is owned by curve PDA, so curve PDA signs
    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token_interface::TransferChecked {
                from: ctx.accounts.token_vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_out,
        ctx.accounts.mint.decimals,
    )?;

    msg!("Buy: {} SOL -> {} tokens (fee: {} lamports)", sol_amount, tokens_out, fee);

    Ok(())
}

const RENT_EXEMPT_RESERVE: u64 = 890880; // ~0.00089 SOL rent exempt minimum