pub mod constants;
pub mod error;
pub mod instructions;
pub mod math;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::ErrorCode;
pub use instructions::*;
pub use state::*;

declare_id!("GxH1TNYSn9NfrNbZ1hbvwprhxb9LhBde3ELmF29fZy9c");

#[program]
pub mod jbl {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize_handler(ctx)
    }

    pub fn create(ctx: Context<Create>, borrow_fee_bps: u32) -> Result<()> {
        create_handler(ctx, borrow_fee_bps)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit_handler(ctx, amount)
    }

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        borrow_handler(ctx, amount)
    }

    pub fn take_lp(ctx: Context<TakeLp>) -> Result<()> {
        take_lp_handler(ctx)
    }

    pub fn repay(ctx: Context<Repay>) -> Result<()> {
        repay_handler(ctx)
    }
}
