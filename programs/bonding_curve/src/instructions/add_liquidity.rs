use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface};

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct LiquidityAction<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [CURVE_SEED, mint.key().as_ref()],
        bump = curve.curve_bump,
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

    /// User position PDA (tracks creator's LP share)
    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [USER_POSITION_SEED, curve.key().as_ref(), creator.key().as_ref()],
        bump,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<LiquidityAction>, sol_amount: u64, token_amount: u64) -> Result<()> {
    let curve_key = ctx.accounts.curve.key();
    let curve = &mut ctx.accounts.curve;
    require!(curve.status == CurveStatus::Active, BondingCurveError::CurveNotActive);
    require!(sol_amount > 0 || token_amount > 0, BondingCurveError::InvalidAmounts);

    let user_position = &mut ctx.accounts.user_position;

    // Initialize position if new
    if user_position.lp_tokens == 0 && user_position.sol_deposited == 0 {
        user_position.user = ctx.accounts.creator.key();
        user_position.curve = curve_key;
        user_position.bump = ctx.bumps.user_position;
    }

    // Calculate LP tokens to mint (proportional to deposit)
    // LP = sqrt(sol_amount * token_amount) based on current pool ratio
    let sol_value = sol_amount as u128;
    let token_value = token_amount as u128;

    let lp_tokens = if curve.sol_reserves == 0 || curve.token_reserves == 0 {
        // First deposit - create initial LP supply
        sol_value
            .checked_mul(token_value)
            .ok_or(BondingCurveError::MathOverflow)?
            .isqrt() as u64
    } else {
        // Proportional deposit
        let sol_share = sol_value
            .checked_mul(curve.total_lp_supply as u128)
            .ok_or(BondingCurveError::MathOverflow)?
            .checked_div(curve.sol_reserves as u128)
            .ok_or(BondingCurveError::MathOverflow)?;

        let token_share = token_value
            .checked_mul(curve.total_lp_supply as u128)
            .ok_or(BondingCurveError::MathOverflow)?
            .checked_div(curve.token_reserves as u128)
            .ok_or(BondingCurveError::MathOverflow)?;

        // Use the smaller share to ensure proportional deposit
        std::cmp::min(sol_share, token_share) as u64
    };

    require!(lp_tokens > 0, BondingCurveError::InvalidAmounts);

    // Transfer SOL from creator to SOL vault
    if sol_amount > 0 {
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
    }

    // Transfer tokens from creator to token vault (creator signs their own transfer)
    if token_amount > 0 {
        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token_interface::TransferChecked {
                    from: ctx.accounts.creator_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            token_amount,
            ctx.accounts.mint.decimals,
        )?;
    }

    // Update curve reserves
    curve.sol_reserves = curve.sol_reserves.checked_add(sol_amount).ok_or(BondingCurveError::MathOverflow)?;
    curve.token_reserves = curve.token_reserves.checked_add(token_amount).ok_or(BondingCurveError::MathOverflow)?;
    curve.total_lp_supply = curve.total_lp_supply.checked_add(lp_tokens).ok_or(BondingCurveError::MathOverflow)?;

    // Update user position
    user_position.sol_deposited = user_position.sol_deposited.checked_add(sol_amount).ok_or(BondingCurveError::MathOverflow)?;
    user_position.tokens_deposited = user_position.tokens_deposited.checked_add(token_amount).ok_or(BondingCurveError::MathOverflow)?;
    user_position.lp_tokens = user_position.lp_tokens.checked_add(lp_tokens).ok_or(BondingCurveError::MathOverflow)?;

    msg!("Add liquidity: {} SOL, {} tokens -> {} LP tokens", sol_amount, token_amount, lp_tokens);

    Ok(())
}