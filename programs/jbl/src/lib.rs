pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("AdeLu1KwKjGFUgqdcchEXEB89jaCAAmVV3nWk89j4bXo");

#[program]
pub mod jbl {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handler(ctx)
    }

    pub fn create_lending_account(ctx: Context<CreateLendingAccount>) -> Result<()> {
        create_lending_account::handler(ctx)
    }
}
