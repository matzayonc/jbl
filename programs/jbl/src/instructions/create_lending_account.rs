use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::LendingAccount;

#[derive(Accounts)]
pub struct CreateLendingAccount<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + LendingAccount::INIT_SPACE,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub lending_account: Account<'info, LendingAccount>,

    /// The token vault for holding deposited tokens
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = lending_account,
        seeds = [b"lending_vault", lending_account.key().as_ref()],
        bump
    )]
    pub lending_vault: Account<'info, TokenAccount>,

    /// The LP token mint for this lending pool
    #[account(
        init,
        payer = payer,
        mint::decimals = mint.decimals,
        mint::authority = lending_account,
        seeds = [b"lp_mint", lending_account.key().as_ref()],
        bump
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The mint of the token being deposited
    pub mint: Account<'info, Mint>,

    /// The authority that will control this lending account
    pub authority: Signer<'info>,

    /// The account that pays for the account creation
    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateLendingAccount>) -> Result<()> {
    let lending_account = &mut ctx.accounts.lending_account;
    let authority = &ctx.accounts.authority;
    let mint = &ctx.accounts.mint;
    let lp_mint = &ctx.accounts.lp_mint;
    let bump = ctx.bumps.lending_account;
    let lp_mint_bump = ctx.bumps.lp_mint;

    lending_account.authority = authority.key();
    lending_account.mint = mint.key();
    lending_account.lp_mint = lp_mint.key();
    lending_account.total_deposited = 0;
    lending_account.total_borrowed = 0;
    lending_account.total_lp_issued = 0;
    lending_account.last_update_slot = Clock::get()?.slot;
    lending_account.bump = bump;
    lending_account.lp_mint_bump = lp_mint_bump;

    msg!(
        "Created lending account for authority: {} with mint: {} and LP mint: {} at slot: {}",
        authority.key(),
        mint.key(),
        lp_mint.key(),
        lending_account.last_update_slot
    );

    Ok(())
}
