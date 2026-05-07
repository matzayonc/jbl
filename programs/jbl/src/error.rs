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
    #[msg("An open borrow position already exists; repay before borrowing again")]
    AlreadyBorrowed,
    #[msg("No open borrow to repay")]
    NoBorrowFound,
    #[msg("Withdrawal queue is full; try again later")]
    WithdrawalQueueFull,
    #[msg("Withdrawal queue is empty")]
    WithdrawalQueueEmpty,
    #[msg("Provided account does not match the queued withdrawal entry")]
    QueueEntryMismatch,
}
