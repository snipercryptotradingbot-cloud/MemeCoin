use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, Token2022, TokenAccount, Mint};
use anchor_spl::token_interface;

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeCurve<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The Token-2022 mint to create a curve for
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [CURVE_SEED, mint.key().as_ref()],
        bump,
    )]
    pub curve: Account<'info, BondingCurve>,

    /// PDA that holds SOL reserves
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [SOL_VAULT_SEED, curve.key().as_ref()],
        bump,
    )]
    /// CHECK: PDA used only as SOL vault, no data stored
    pub sol_vault: UncheckedAccount<'info>,

    /// Token vault ATA owned by the curve PDA
    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = curve,
        associated_token::token_program = token_program,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Creator's token account to deposit initial tokens from
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = creator,
        associated_token::token_program = token_program,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<InitializeCurve>,
    sol_amount: u64,
    token_amount: u64,
    sol_target: u64,
    fee_basis_points: u16,
) -> Result<()> {
    require!(sol_amount >= MIN_SOL_DEPOSIT, BondingCurveError::InsufficientSol);
    require!(token_amount > 0, BondingCurveError::InvalidAmounts);
    require!(sol_target > 0, BondingCurveError::InvalidSolTarget);
    require!(
        fee_basis_points <= 10_000,
        BondingCurveError::InvalidFee
    );

    let curve = &mut ctx.accounts.curve;
    let clock = Clock::get()?;

    // Initialize curve state
    curve.creator = ctx.accounts.creator.key();
    curve.mint = ctx.accounts.mint.key();
    curve.curve_bump = ctx.bumps.curve;
    curve.sol_vault_bump = ctx.bumps.sol_vault;
    curve.token_vault_bump = ctx.bumps.token_vault; // not used for ATA but stored
    curve.status = CurveStatus::Active;
    curve.sol_reserves = sol_amount;
    curve.token_reserves = token_amount;
    curve.initial_sol_target = sol_target;
    curve.fee_basis_points = fee_basis_points;
    curve.platform_wallet = ctx.accounts.creator.key(); // defaults to creator, can be updated
    curve.total_swaps = 0;
    curve.created_at = clock.unix_timestamp;
    curve.total_lp_supply = 100; // initial LP for creator
    curve.padding = [0u8; 32];

    // Transfer SOL from creator to SOL vault PDA
    let ix = anchor_lang::system_program::Transfer {
        from: ctx.accounts.creator.to_account_info(),
        to: ctx.accounts.sol_vault.to_account_info(),
    };
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            ix,
        ),
        sol_amount,
    )?;

    // Transfer tokens from creator to token vault
    let mint_key = ctx.accounts.mint.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        CURVE_SEED,
        mint_key.as_ref(),
        &[curve.curve_bump],
    ]];

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token_interface::TransferChecked {
                from: ctx.accounts.creator_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_vault.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
            signer_seeds,
        ),
        token_amount,
        ctx.accounts.mint.decimals,
    )?;

    msg!("Bonding curve initialized for mint: {}", ctx.accounts.mint.key());
    msg!("SOL deposited: {}, Tokens deposited: {}", sol_amount, token_amount);

    Ok(())
}
