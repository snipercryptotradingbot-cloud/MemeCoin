use anchor_lang::prelude::*;

#[error_code]
pub enum BondingCurveError {
    #[msg("Curve is not active")]
    CurveNotActive,

    #[msg("Curve is already closed")]
    CurveAlreadyClosed,

    #[msg("Insufficient SOL provided")]
    InsufficientSol,

    #[msg("Insufficient tokens provided")]
    InsufficientTokens,

    #[msg("Slippage tolerance exceeded: minimum tokens not met")]
    SlippageExceededTokens,

    #[msg("Slippage tolerance exceeded: minimum SOL not met")]
    SlippageExceededSol,

    #[msg("Invalid fee: must be between 0 and 10000 basis points")]
    InvalidFee,

    #[msg("Invalid amounts: cannot deposit zero")]
    InvalidAmounts,

    #[msg("Arithmetic overflow")]
    MathOverflow,

    #[msg("Only the curve creator can perform this action")]
    Unauthorized,

    #[msg("Insufficient LP tokens for removal")]
    InsufficientLpTokens,

    #[msg("Curve has no reserves to withdraw")]
    NoReserves,

    #[msg("Token vault has insufficient funds")]
    TokenVaultInsufficient,

    #[msg("Invalid SOL target: must be greater than zero")]
    InvalidSolTarget,
}
