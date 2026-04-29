use crate::state::Pool;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    /// The token vault for holding deposited tokens
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = pool,
        seeds = [b"pool", pool.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The LP token mint for this lending pool
    #[account(
        init,
        payer = payer,
        mint::decimals = mint.decimals,
        mint::authority = pool,
        seeds = [b"lp_mint", pool.key().as_ref()],
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

pub fn create_handler(ctx: Context<Create>, borrow_fee_bps: u32) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let authority = &ctx.accounts.authority;
    let mint = &ctx.accounts.mint;
    let lp_mint = &ctx.accounts.lp_mint;
    let bump = ctx.bumps.pool;
    let lp_mint_bump = ctx.bumps.lp_mint;

    pool.authority = authority.key();
    pool.mint = mint.key();
    pool.lp_mint = lp_mint.key();
    pool.total_deposited = 0;
    pool.total_borrowed = 0;
    pool.total_debt_shares = 0;
    pool.last_accrual_ts = Clock::get()?.unix_timestamp;
    pool.total_lp_issued = 0;
    pool.ltv_percent = 75; // Default to 75% LTV
    pool.borrow_fee_bps = borrow_fee_bps;
    pool.bump = bump;
    pool.lp_mint_bump = lp_mint_bump;

    msg!(
        "Created lending account for authority: {} with mint: {} and LP mint: {} at slot: {}",
        authority.key(),
        mint.key(),
        lp_mint.key(),
        Clock::get()?.slot
    );

    Ok(())
}
