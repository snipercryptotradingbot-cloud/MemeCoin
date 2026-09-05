use anchor_lang::prelude::*;

/// BondingCurve account stores the state of a single token's bonding curve.
#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    /// The wallet that created this curve
    pub creator: Pubkey,           // 32
    /// The Token-2022 mint address
    pub mint: Pubkey,              // 32
    /// Bump seed for curve PDA
    pub curve_bump: u8,            // 1
    /// Bump seed for SOL vault PDA
    pub sol_vault_bump: u8,        // 1
    /// Bump seed for token vault (ATA)
    pub token_vault_bump: u8,      // 1
    /// Current status: Active=0, Paused=1, Closed=2
    pub status: CurveStatus,       // 1
    /// SOL reserves in lamports
    pub sol_reserves: u64,         // 8
    /// Token reserves in base units (e.g. lamports for 9 decimals)
    pub token_reserves: u64,       // 8
    /// SOL target for UI progress display
    pub initial_sol_target: u64,   // 8
    /// Platform fee in basis points (e.g. 100 = 1%)
    pub fee_basis_points: u16,     // 2
    /// Wallet that receives fees
    pub platform_wallet: Pubkey,   // 32
    /// Total number of swaps executed
    pub total_swaps: u64,          // 8
    /// Timestamp of creation
    pub created_at: i64,           // 8
    /// Total LP tokens supply (virtual, for share calculation)
    pub total_lp_supply: u64,      // 8
    /// Reserved for future use
    pub padding: [u8; 32],         // 32
}

/// Curve status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CurveStatus {
    Active,
    Paused,
    Closed,
}

/// UserPosition tracks a user's share in a specific bonding curve.
/// One position per user per curve.
#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    /// The user's wallet
    pub user: Pubkey,              // 32
    /// The curve this position belongs to
    pub curve: Pubkey,             // 32
    /// Bump seed
    pub bump: u8,                  // 1
    /// Total SOL deposited via add_liquidity
    pub sol_deposited: u64,        // 8
    /// Total tokens deposited via add_liquidity
    pub tokens_deposited: u64,     // 8
    /// LP tokens accumulated (share of pool)
    pub lp_tokens: u64,            // 8
    /// Reserved
    pub padding: [u8; 16],         // 16
}
