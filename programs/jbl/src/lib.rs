pub mod constants;
pub mod error;
pub mod fees;
pub mod instructions;
pub mod math;
pub mod state;
pub mod withdrawal_queue;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::ErrorCode;
pub use fees::*;
pub use instructions::*;
pub use state::*;

declare_id!("BkWW6JpZ3k7D723LbEWtGq1F7rgvqiuVrFFGA4ap87yn");

#[program]
pub mod jbl {
    use super::*;

    pub fn create(ctx: Context<Create>, m1: u64, c1: u64, m2: u64, c2: u64) -> Result<()> {
        create_handler(ctx, m1, c1, m2, c2)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit_handler(ctx, amount)
    }

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        borrow_handler(ctx, amount)
    }

    pub fn take_lp(ctx: Context<TakeLp>, amount: u64) -> Result<()> {
        take_lp_handler(ctx, amount)
    }

    pub fn put_lp(ctx: Context<PutLp>, amount: u64) -> Result<()> {
        put_lp_handler(ctx, amount)
    }

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        repay_handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        withdraw_handler(ctx, amount)
    }

    pub fn process_queue_entry(ctx: Context<ProcessQueueEntry>) -> Result<()> {
        process_queue_entry_handler(ctx)
    }

    pub fn participate(ctx: Context<Participate>, amount: u64) -> Result<()> {
        participate_handler(ctx, amount)
    }

    pub fn leave(ctx: Context<Leave>, shares: u64) -> Result<()> {
        leave_handler(ctx, shares)
    }

    pub fn process_vault_queue_entry(ctx: Context<ProcessVaultQueueEntry>) -> Result<()> {
        process_vault_queue_entry_handler(ctx)
    }

    pub fn borrow_with_hedge(
        ctx: Context<BorrowWithHedge>,
        amount: u64,
        duration: u64,
    ) -> Result<()> {
        borrow_with_hedge_handler(ctx, amount, duration)
    }

    pub fn settle_rate_hedge_match(ctx: Context<SettleRateHedgeMatch>) -> Result<()> {
        settle_rate_hedge_match_handler(ctx)
    }

    pub fn mock_swap(ctx: Context<MockSwap>, amount: u64) -> Result<()> {
        mock_swap_handler(ctx, amount)
    }

    pub fn flash_borrow(ctx: Context<FlashBorrow>, amount: u64) -> Result<()> {
        flash_borrow_handler(ctx, amount)
    }

    pub fn flash_repay(ctx: Context<FlashRepay>, amount: u64) -> Result<()> {
        flash_repay_handler(ctx, amount)
    }

    pub fn create_rate_hedge_offer(
        ctx: Context<CreateRateHedgeOffer>,
        fixed_rate_bps: u64,
        min_duration: u64,
        max_duration: u64,
        amount: u64,
        collateral_amount: u64,
    ) -> Result<()> {
        create_rate_hedge_offer_handler(
            ctx,
            fixed_rate_bps,
            min_duration,
            max_duration,
            amount,
            collateral_amount,
        )
    }
}
