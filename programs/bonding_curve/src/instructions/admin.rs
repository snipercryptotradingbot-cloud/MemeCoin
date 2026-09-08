use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::constants::*;
use crate::errors::*;
use crate::state::*;

#[derive(Accounts)]
pub struct AdminAction<'info> {
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
}

pub fn pause_curve(ctx: Context<AdminAction>) -> Result<()> {
    let curve = &mut ctx.accounts.curve;
    require!(curve.status == CurveStatus::Active, BondingCurveError::CurveNotActive);

    curve.status = CurveStatus::Paused;
    msg!("Curve paused for mint: {}", curve.mint);
    Ok(())
}

pub fn resume_curve(ctx: Context<AdminAction>) -> Result<()> {
    let curve = &mut ctx.accounts.curve;
    require!(curve.status == CurveStatus::Paused, BondingCurveError::CurveNotActive);

    curve.status = CurveStatus::Active;
    msg!("Curve resumed for mint: {}", curve.mint);
    Ok(())
}

pub fn close_curve(ctx: Context<AdminAction>) -> Result<()> {
    let curve = &mut ctx.accounts.curve;
    require!(
        curve.status == CurveStatus::Active
            || curve.status == CurveStatus::Paused
            || curve.status == CurveStatus::Migrated,
        BondingCurveError::CurveAlreadyClosed
    );

    curve.status = CurveStatus::Closed;
    msg!("Curve closed for mint: {}", curve.mint);
    Ok(())
}