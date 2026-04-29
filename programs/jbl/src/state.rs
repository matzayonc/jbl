use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LendingAccount {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub lp_mint: Pubkey, // The LP token mint for this lending pool
    pub total_deposited: u64,
    pub total_borrowed: u64,
    pub total_lp_issued: u64, // Total LP tokens issued
    pub last_update_slot: u64,
    pub ltv_percent: u8, // Loan-to-Value ratio as percentage (e.g., 75 for 75%)
    pub borrow_fee_bps: u32, // Annual interest rate in basis points (e.g., 50 = 0.5%, 100_000 = 1000%)
    pub bump: u8,
    pub lp_mint_bump: u8,
}

/// Tracks a user's deposit and any open borrow position for a lending account.
/// Created on first deposit; borrow fields are populated when the user borrows.
/// Closed when the user calls `take_lp` to claim LP tokens.
#[account]
#[derive(InitSpace)]
pub struct UserPosition {
    /// The user who owns this position
    pub authority: Pubkey,
    /// The lending account this position belongs to
    pub lending_account: Pubkey,
    /// Amount of underlying tokens deposited (used as collateral)
    pub deposited_amount: u64,
    /// LP tokens that will be minted when `take_lp` is called (pre-calculated at deposit time)
    pub lp_tokens_owed: u64,
    /// Slot at which the deposit was made
    pub deposited_at_slot: u64,
    /// Principal amount borrowed (0 if no active borrow)
    pub principal: u64,
    /// Annual interest rate in basis points at the time of borrow
    pub interest_rate_bps: u32,
    /// Unix timestamp (seconds) at which the borrow was opened (0 if no active borrow)
    pub borrowed_at_ts: i64,
    pub bump: u8,
}
