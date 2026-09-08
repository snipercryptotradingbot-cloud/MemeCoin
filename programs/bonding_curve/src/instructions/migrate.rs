use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct MigrateToDex<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [CURVE_SEED, mint.key().as_ref()],
        bump = curve.curve_bump,
        has_one = creator,
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

    /// Creator's token account
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
        associated_token::token_program = token_program,
    )]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigrateToDex>) -> Result<()> {
    require!(
        ctx.accounts.curve.status == CurveStatus::Active,
        BondingCurveError::CurveNotActive
    );

    // Graduation rule: only migrate once the curve has reached its SOL target
    require!(
        ctx.accounts.curve.sol_reserves >= ctx.accounts.curve.initial_sol_target,
        BondingCurveError::CurveNotGraduated
    );

    let sol_vault_lamports = ctx.accounts.sol_vault.lamports();
    let tokens_out = ctx.accounts.token_vault.amount;
    let sol_out = sol_vault_lamports.saturating_sub(RENT_EXEMPT_RESERVE);

    require!(sol_out > 0 || tokens_out > 0, BondingCurveError::NoReserves);

    let mint_key = ctx.accounts.curve.mint;
    let curve_bump = ctx.accounts.curve.curve_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[
        CURVE_SEED,
        mint_key.as_ref(),
        &[curve_bump],
    ]];

    // Pay out remaining SOL to creator via direct lamport manipulation
    if sol_out > 0 {
        **ctx.accounts.sol_vault.to_account_info().try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += sol_out;
    }

    // Pay out entire token reserve to creator
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

    // Mark curve as graduated
    let curve = &mut ctx.accounts.curve;
    curve.sol_reserves = 0;
    curve.token_reserves = 0;
    curve.total_swaps = curve.total_swaps.checked_add(1).ok_or(BondingCurveError::MathOverflow)?;
    curve.status = CurveStatus::Migrated;

    msg!(
        "Migrate to DEX: {} SOL, {} tokens paid to creator {}. Frontend should create DLMM pool.",
        sol_out,
        tokens_out,
        ctx.accounts.creator.key()
    );

    Ok(())
}

const RENT_EXEMPT_RESERVE: u64 = 890880;
