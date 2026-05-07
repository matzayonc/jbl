use crate::math::{amount_to_shares, shares_to_amount};
use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub pool: AccountLoader<'info, Pool>,

    /// CHECK: PDA used as vault authority for outbound token transfers.
    #[account(
        seeds = [b"pool_signer", pool.key().as_ref()],
        bump,
    )]
    pub pool_signer: UncheckedAccount<'info>,

    /// The mint of the token being borrowed
    pub mint: Account<'info, Mint>,

    /// The borrower
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user's token account (destination) — created if it doesn't exist yet
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The lending account's token account (source)
    #[account(
        mut,
        seeds = [b"pool", pool.key().as_ref()],
        bump,
        constraint = vault.mint == mint.key(),
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The user's position — holds deposit collateral and active borrow fields.
    #[account(
        mut,
        seeds = [b"user_position", pool.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
        constraint = user_position.pool == pool.key()
            @ crate::error::ErrorCode::InvalidAmount,
        constraint = user_position.deposited_amount > 0
            @ crate::error::ErrorCode::InsufficientFunds,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn borrow_handler(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);
    require!(
        ctx.accounts.vault.amount >= amount,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 1. Accrue interest on the pool ────────────────────────────────────────
    let current_ts = Clock::get()?.unix_timestamp;
    ctx.accounts.pool.load_mut()?.accrue_interest(current_ts)?;

    // ── 2. LTV check and share calculation ───────────────────────────────────
    let (new_shares, pool_bump) = {
        let pool = ctx.accounts.pool.load()?;
        let deposited = ctx.accounts.user_position.deposited_amount;
        let max_borrowable = deposited
            .checked_mul(pool.ltv_percent as u64)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;

        let current_debt = if pool.total_debt_shares > 0 {
            shares_to_amount(
                ctx.accounts.user_position.debt_shares,
                pool.total_borrowed,
                pool.total_debt_shares,
            )
            .ok_or(crate::error::ErrorCode::MathOverflow)?
        } else {
            0
        };

        let available = max_borrowable
            .checked_sub(current_debt)
            .ok_or(crate::error::ErrorCode::InsufficientFunds)?;
        require!(amount <= available, crate::error::ErrorCode::InsufficientFunds);

        let new_shares = amount_to_shares(amount, pool.total_borrowed, pool.total_debt_shares)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        require!(new_shares > 0, crate::error::ErrorCode::InvalidAmount);

        (new_shares, pool.pool_signer_bump)
    };

    // ── 3. Update user position ───────────────────────────────────────────────
    ctx.accounts.user_position.debt_shares = ctx
        .accounts
        .user_position
        .debt_shares
        .checked_add(new_shares)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    // ── 4. Transfer tokens to the user ────────────────────────────────────────
    let pool_key = ctx.accounts.pool.key();
    let seeds = &[b"pool_signer" as &[u8], pool_key.as_ref(), &[pool_bump]];
    let signer = &[&seeds[..]];

    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool_signer.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    // ── 5. Update pool state ──────────────────────────────────────────────────
    let (total_borrowed, total_debt_shares) = {
        let mut pool = ctx.accounts.pool.load_mut()?;
        pool.total_debt_shares = pool
            .total_debt_shares
            .checked_add(new_shares)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        pool.total_borrowed = pool
            .total_borrowed
            .checked_add(amount)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        (pool.total_borrowed, pool.total_debt_shares)
    };

    msg!(
        "Borrowed {} → {} shares. Pool total_borrowed: {}, total_shares: {}",
        amount,
        new_shares,
        total_borrowed,
        total_debt_shares,
    );

    Ok(())
}
