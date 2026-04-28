use anchor_lang::prelude::*;
use crate::state::LendingAccount;

#[derive(Accounts)]
pub struct CreateLendingAccount<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + LendingAccount::INIT_SPACE,
        seeds = [b"lending", authority.key().as_ref()],
        bump
    )]
    pub lending_account: Account<'info, LendingAccount>,
    
    /// The authority that will control this lending account
    pub authority: Signer<'info>,
    
    /// The account that pays for the account creation
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateLendingAccount>) -> Result<()> {
    let lending_account = &mut ctx.accounts.lending_account;
    let authority = &ctx.accounts.authority;
    let bump = ctx.bumps.lending_account;

    lending_account.authority = authority.key();
    lending_account.total_deposited = 0;
    lending_account.total_borrowed = 0;
    lending_account.last_update_slot = Clock::get()?.slot;
    lending_account.bump = bump;

    msg!(
        "Created lending account for authority: {} at slot: {}",
        authority.key(),
        lending_account.last_update_slot
    );

    Ok(())
}