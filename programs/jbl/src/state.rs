use crate::{math::compute_interest, UtilizationFeeConfig};
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub lp_mint: Pubkey, // The LP token mint for this lending pool
    pub total_deposited: u64,
    pub total_borrowed: u64,
    /// Sum of all users' debt shares.
    pub total_debt_shares: u64,
    /// Unix timestamp of the last interest accrual on total_borrowed.
    pub last_accrual_ts: i64,
    pub total_lp_issued: u64, // Total LP tokens issued
    pub ltv_percent: u8,      // Loan-to-Value ratio as percentage (e.g., 75 for 75%)
    pub fee_config: UtilizationFeeConfig,
    pub bump: u8,
    pub lp_mint_bump: u8,
}

impl Pool {
    pub fn calculate_utilization(&self) -> u64 {
        if self.total_deposited == 0 {
            0
        } else {
            (self.total_borrowed as u128)
                .checked_mul(10_000)
                .unwrap_or(0)
                .checked_div(self.total_deposited as u128)
                .unwrap_or(0) as u64
        }
    }

    /// Accrue interest into `total_borrowed` based on elapsed time since last
    /// accrual, then update `last_accrual_ts` to `current_ts`.
    pub fn accrue_interest(&mut self, current_ts: i64) -> Result<()> {
        let elapsed = (current_ts.saturating_sub(self.last_accrual_ts)).max(0) as u64;
        if elapsed == 0 {
            return Ok(());
        }

        let utilization = self.calculate_utilization();
        let fee_bps = self.fee_config.get_fee_bps(utilization);

        let interest = compute_interest(self.total_borrowed, fee_bps, elapsed)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        self.total_borrowed = self
            .total_borrowed
            .checked_add(interest)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        self.last_accrual_ts = current_ts;
        Ok(())
    }
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
    pub pool: Pubkey,
    /// Amount of underlying tokens deposited (used as collateral)
    pub deposited_amount: u64,
    /// LP tokens that will be minted when `take_lp` is called (pre-calculated at deposit time)
    pub lp_tokens_owed: u64,
    /// Slot at which the deposit was made
    pub deposited_at_slot: u64,
    /// Debt shares held by this user (0 if no active borrow).
    /// Current debt = debt_shares * pool.total_borrowed / pool.total_debt_shares
    pub debt_shares: u64,
    pub bump: u8,
}
