pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::ErrorCode;
pub use instructions::*;
pub use state::*;

declare_id!("FGauH3y9Qh5k98WxExrz8CVcqUA6VQuepLPRNxfuB3JH");

#[program]
pub mod jbl {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn create_lending_account(ctx: Context<CreateLendingAccount>) -> Result<()> {
        create_lending_account::handler(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit::handler(ctx, amount)
    }
}
