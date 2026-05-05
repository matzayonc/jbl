pub mod constants;
pub mod error;
pub mod fees;
pub mod instructions;
pub mod math;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::ErrorCode;
pub use fees::*;
pub use instructions::*;
pub use state::*;

declare_id!("EhZdkVUmUAcYQvrLiKw86AxKo5P1ZKvNnSgpAozBSbAv");

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

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        repay_handler(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        withdraw_handler(ctx, amount)
    }
}
