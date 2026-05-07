use crate::state::Pool;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub const POOL_SPACE: usize = 8 + std::mem::size_of::<Pool>();

#[derive(Accounts)]
pub struct Create<'info> {
    /// The pool data account.  Must be pre-allocated (size = POOL_SPACE) and
    /// owned by this program before calling `create`.  Pre-allocating in a
    /// separate transaction bypasses the 10 KB CPI account-creation limit.
    #[account(zero)]
    pub pool: AccountLoader<'info, Pool>,

    /// PDA used as the authority for the vault and LP mint.
    /// Derived deterministically from the pool's public key so it is still
    /// unique even though the pool itself is a keypair account.
    /// CHECK: only used as authority — no data stored here.
    #[account(
        seeds = [b"pool_signer", pool.key().as_ref()],
        bump
    )]
    pub pool_signer: UncheckedAccount<'info>,

    /// The token vault for holding deposited tokens
    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = pool_signer,
        seeds = [b"pool", pool.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The LP token mint for this lending pool
    #[account(
        init,
        payer = payer,
        mint::decimals = mint.decimals,
        mint::authority = pool_signer,
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

pub fn create_handler(ctx: Context<Create>, m1: u64, c1: u64, m2: u64, c2: u64) -> Result<()> {
    let mut pool = ctx.accounts.pool.load_init()?;

    pool.authority = ctx.accounts.authority.key();
    pool.mint = ctx.accounts.mint.key();
    pool.lp_mint = ctx.accounts.lp_mint.key();
    pool.total_deposited = 0;
    pool.total_borrowed = 0;
    pool.total_debt_shares = 0;
    pool.last_accrual_ts = Clock::get()?.unix_timestamp;
    pool.total_lp_issued = 0;
    pool.ltv_percent = 75;
    pool.fee_config = crate::fees::UtilizationFeeConfig { m1, c1, m2, c2 };
    pool.pool_signer_bump = ctx.bumps.pool_signer;
    pool.lp_mint_bump = ctx.bumps.lp_mint;
    // withdrawal_queue is zero-initialised by load_init (head=0, tail=0)

    msg!(
        "Created lending pool for authority: {} with mint: {} and LP mint: {} at slot: {}",
        ctx.accounts.authority.key(),
        ctx.accounts.mint.key(),
        ctx.accounts.lp_mint.key(),
        Clock::get()?.slot
    );

    Ok(())
}
