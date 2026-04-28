pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::ErrorCode;
pub use instructions::*;
pub use state::*;

declare_id!("13u41zmNh2HykqTvh82K5vaTVTSegX9jMCFt2DqsoxLn");

#[program]
pub mod jbl {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize_handler(ctx)
    }

    pub fn create_lending_account(ctx: Context<CreateLendingAccount>) -> Result<()> {
        create_lending_account_handler(ctx)
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
}
