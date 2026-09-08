use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

#[cfg(feature = "mainnet")]
declare_id!("6LAcMQeg8TyvMcveNMFmwUTkLyHa49kfzoTm18TjD151");
#[cfg(not(feature = "mainnet"))]
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

    /// Graduate the curve to a Meteora DLMM pool once the SOL target is reached.
    /// Transfers all remaining SOL and tokens to the creator.
    /// The creator then uses the frontend/DLMM SDK to create the pool and seed liquidity.
    /// Only the creator can call.
    pub fn migrate_to_dex(ctx: Context<MigrateToDex>) -> Result<()> {
        instructions::migrate::handler(ctx)
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
