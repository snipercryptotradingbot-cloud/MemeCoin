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
    /// Current status: Active=0, Paused=1, Closed=2, Migrated=3
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
    /// DLMM pool address (set on migration)
    pub dlmm_pool: Pubkey,         // 32
    /// Reserved for future use
    pub padding: [u8; 32],         // 32
}

/// Curve status enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum CurveStatus {
    Active,
    Paused,
    Closed,
    Migrated,
}
