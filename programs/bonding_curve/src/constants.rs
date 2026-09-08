use anchor_lang::prelude::*;

/// PDA seed prefixes
pub const CURVE_SEED: &[u8] = b"bonding_curve";
pub const SOL_VAULT_SEED: &[u8] = b"sol_vault";
pub const TOKEN_VAULT_SEED: &[u8] = b"token_vault";

/// Default fee: 1% (100 basis points)
pub const DEFAULT_FEE_BASIS_POINTS: u16 = 100;

/// Default SOL target for bonding curve
pub const DEFAULT_SOL_TARGET: u64 = 85_000_000_000; // 85 SOL in lamports

/// Minimum SOL deposit for initialization
pub const MIN_SOL_DEPOSIT: u64 = 1_000_000_000; // 1 SOL in lamports
