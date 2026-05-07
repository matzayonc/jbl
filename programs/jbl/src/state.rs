use crate::{math::compute_interest, withdrawal_queue::WithdrawalQueue, UtilizationFeeConfig};
use anchor_lang::prelude::*;

/// Pool account stored as zero-copy to avoid copying the ~40 KB withdrawal
/// queue onto the stack during Borsh deserialization.
///
/// Field ordering is chosen to eliminate implicit repr(C) padding:
///   offsets 0-95    : three Pubkeys  (3 × 32 = 96 bytes, align 1)
///   offsets 96-167  : five u64/i64  (5 × 8 = 40) + fee_config (4×8 = 32)
///   offsets 168-170 : ltv_percent, pool_signer_bump, lp_mint_bump  (3 × u8)
///   offsets 171-175 : _pad [u8;5]  (align withdrawal_queue to 8)
///   offsets 176-...  : WithdrawalQueue  (1024 entries × 40 bytes = 40960 + 8 header)
#[account(zero_copy)]
pub struct Pool {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub lp_mint: Pubkey,
    pub total_deposited: u64,
    pub total_borrowed: u64,
    pub total_debt_shares: u64,
    pub last_accrual_ts: i64,
    pub total_lp_issued: u64,
    pub fee_config: UtilizationFeeConfig,
    pub ltv_percent: u8,
    /// Bump seed for the `pool_signer` PDA (`seeds = [b"pool_signer", pool.key()]`).
    /// Used to sign vault-transfer and LP-mint CPIs on behalf of the pool.
    pub pool_signer_bump: u8,
    pub lp_mint_bump: u8,
    _pad: [u8; 5], // explicit padding — no implicit/uninitialised bytes
    pub withdrawal_queue: WithdrawalQueue,
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
    /// Debt shares held by this user (0 if no active borrow).
    /// Current debt = debt_shares * pool.total_borrowed / pool.total_debt_shares
    pub debt_shares: u64,
    pub bump: u8,
}
