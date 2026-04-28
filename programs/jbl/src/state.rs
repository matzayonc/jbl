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
    pub bump: u8,
    pub lp_mint_bump: u8,
}

/// Tracks a pending deposit before LP tokens have been claimed.
/// The user can hold this as collateral or call `take_lp` to receive LP tokens.
#[account]
#[derive(InitSpace)]
pub struct DepositReceipt {
    /// The user who made the deposit
    pub authority: Pubkey,
    /// The lending account this deposit belongs to
    pub lending_account: Pubkey,
    /// Amount of underlying tokens deposited
    pub deposited_amount: u64,
    /// LP tokens that will be minted when `take_lp` is called (pre-calculated at deposit time)
    pub lp_tokens_owed: u64,
    /// Slot at which the deposit was made
    pub deposited_at_slot: u64,
    pub bump: u8,
}
