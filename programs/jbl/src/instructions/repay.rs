use crate::math::{amount_to_shares_burned, shares_to_amount};
use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(
        mut,
        seeds = [b"lending", pool.authority.as_ref(), mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
    )]
    pub pool: Account<'info, Pool>,

    /// The mint of the token being repaid
    pub mint: Account<'info, Mint>,

    /// The borrower
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The borrower's token account (source of repayment)
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The lending vault (destination of repayment)
    #[account(
        mut,
        seeds = [b"pool", pool.key().as_ref()],
        bump,
        constraint = pool.mint == mint.key(),
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The user's position — borrow fields are reset on successful repay
    #[account(
        mut,
        seeds = [b"user_position", pool.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
        constraint = user_position.pool == pool.key()
            @ crate::error::ErrorCode::NoBorrowFound,
        constraint = user_position.debt_shares > 0
            @ crate::error::ErrorCode::NoBorrowFound,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn repay_handler(ctx: Context<Repay>, amount: u64) -> Result<()> {
    let current_ts = Clock::get()?.unix_timestamp;

    // ── 1. Accrue interest on the pool ──────────────────────────────────────────
    ctx.accounts.pool.accrue_interest(current_ts)?;

    // ── 2. Compute the exact amount owed ──────────────────────────────────────
    let pool = &ctx.accounts.pool;
    let debt_shares = ctx.accounts.user_position.debt_shares;
    let total_due = shares_to_amount(debt_shares, pool.total_borrowed, pool.total_debt_shares)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let repay_amount = amount.min(total_due);

    require!(
        ctx.accounts.user_token_account.amount >= repay_amount,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 3. Derive shares burned from repay_amount ────────────────────────────
    let shares_to_burn = amount_to_shares_burned(
        repay_amount,
        pool.total_borrowed,
        pool.total_debt_shares,
        debt_shares,
    )
    .ok_or(crate::error::ErrorCode::MathOverflow)?;

    // ── 4. Transfer back to the vault ───────────────────────────────────────────
    let transfer_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    anchor_spl::token::transfer(
        CpiContext::new(
            *ctx.accounts.token_program.to_account_info().key,
            transfer_accounts,
        ),
        repay_amount,
    )?;

    // ── 5. Update pool state ─────────────────────────────────────────────────
    let pool = &mut ctx.accounts.pool;
    pool.total_debt_shares = pool
        .total_debt_shares
        .checked_sub(shares_to_burn)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    pool.total_borrowed = pool
        .total_borrowed
        .checked_sub(repay_amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    // ── 6. Update user position ─────────────────────────────────────────────────
    ctx.accounts.user_position.debt_shares = debt_shares
        .checked_sub(shares_to_burn)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    msg!(
        "Repaid {} tokens ({} shares). Pool total_borrowed: {}, total_shares: {}",
        repay_amount,
        shares_to_burn,
        pool.total_borrowed,
        pool.total_debt_shares,
    );

    Ok(())
}
