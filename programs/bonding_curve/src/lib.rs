use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3MQL5zPvAZvC8ZWkLc5qkGy3Cy31KFwxA8zngNQfoTu6");

#[program]
pub mod bonding_curve {
    use super::*;

    /// Initialize a new bonding curve for a token.
    /// Deposits initial SOL and tokens into the curve.
    pub fn initialize_curve(
        ctx: Context<InitializeCurve>,
        sol_amount: u64,
        token_amount: u64,
        sol_target: u64,
        fee_basis_points: u16,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, sol_amount, token_amount, sol_target, fee_basis_points)
    }

    /// Buy tokens with SOL. Applies fee to SOL input.
    pub fn buy_tokens(
        ctx: Context<SwapTokens>,
        sol_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        instructions::buy::handler(ctx, sol_amount, min_tokens_out)
    }

    /// Sell tokens for SOL. Applies fee to token input.
    pub fn sell_tokens(
        ctx: Context<SwapTokens>,
        token_amount: u64,
        min_sol_out: u64,
    ) -> Result<()> {
        instructions::sell::handler(ctx, token_amount, min_sol_out)
    }

    /// Add liquidity proportionally. Only creator can call.
    pub fn add_liquidity(
        ctx: Context<LiquidityAction>,
        sol_amount: u64,
        token_amount: u64,
    ) -> Result<()> {
        instructions::add_liquidity::handler(ctx, sol_amount, token_amount)
    }

    /// Remove liquidity proportionally. Only creator can call.
    pub fn remove_liquidity(
        ctx: Context<LiquidityAction>,
        lp_tokens: u64,
    ) -> Result<()> {
        instructions::remove_liquidity::handler(ctx, lp_tokens)
    }

    /// Pause the curve (stop swaps). Only creator can call.
    pub fn pause_curve(ctx: Context<AdminAction>) -> Result<()> {
        instructions::admin::pause_curve(ctx)
    }

    /// Resume the curve after pause. Only creator can call.
    pub fn resume_curve(ctx: Context<AdminAction>) -> Result<()> {
        instructions::admin::resume_curve(ctx)
    }

    /// Close the curve and withdraw all remaining funds. Only creator can call.
    pub fn close_curve(ctx: Context<AdminAction>) -> Result<()> {
        instructions::admin::close_curve(ctx)
    }
}