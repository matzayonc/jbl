use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Custom error message")]
    CustomError,
    #[msg("Invalid amount provided")]
    InvalidAmount,
    #[msg("Mathematical operation overflow")]
    MathOverflow,
    #[msg("Insufficient funds")]
    InsufficientFunds,
}
