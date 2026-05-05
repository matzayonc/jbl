use crate::math::{amount_to_shares, shares_to_amount};
use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(
        mut,
        seeds = [b"lending", pool_authority.key().as_ref(), mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
    )]
    pub pool: Account<'info, Pool>,

    /// CHECK: Only used as a seed for pool PDA derivation.
    pub pool_authority: UncheckedAccount<'info>,

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
    /// Must already exist (user must have deposited first).
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
    ctx.accounts.pool.accrue_interest(current_ts)?;

    // ── 2. LTV check against user's current debt ──────────────────────────────
    let pool = &ctx.accounts.pool;
    let max_borrowable = ctx
        .accounts
        .user_position
        .deposited_amount
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

    let available_to_borrow = max_borrowable
        .checked_sub(current_debt)
        .ok_or(crate::error::ErrorCode::InsufficientFunds)?;

    require!(
        amount <= available_to_borrow,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 3. Issue shares (before adding amount to total_borrowed) ──────────────
    let new_shares = amount_to_shares(amount, pool.total_borrowed, pool.total_debt_shares)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    require!(new_shares > 0, crate::error::ErrorCode::InvalidAmount);

    ctx.accounts.user_position.debt_shares = ctx
        .accounts
        .user_position
        .debt_shares
        .checked_add(new_shares)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    // ── 4. Extract signer seeds before mutating pool ──────────────────────────
    let pool_bump = ctx.accounts.pool.bump;
    let authority_key = ctx.accounts.pool_authority.key();
    let mint_key = ctx.accounts.mint.key();

    // ── 5. Transfer tokens to the user ────────────────────────────────────────
    let seeds = &[
        b"lending" as &[u8],
        authority_key.as_ref(),
        mint_key.as_ref(),
        &[pool_bump],
    ];
    let signer = &[&seeds[..]];

    let transfer_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            transfer_accounts,
            signer,
        ),
        amount,
    )?;

    // ── 6. Update pool state ──────────────────────────────────────────────────
    let pool = &mut ctx.accounts.pool;
    pool.total_debt_shares = pool
        .total_debt_shares
        .checked_add(new_shares)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    pool.total_borrowed = pool
        .total_borrowed
        .checked_add(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    msg!(
        "Borrowed {} → {} shares. Pool total_borrowed: {}, total_shares: {}",
        amount,
        new_shares,
        pool.total_borrowed,
        pool.total_debt_shares,
    );

    Ok(())
}
