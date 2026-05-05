use crate::math::shares_to_amount;
use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"lending", pool.authority.as_ref(), mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
    )]
    pub pool: Account<'info, Pool>,

    /// The mint of the token being withdrawn
    pub mint: Account<'info, Mint>,

    /// The withdrawer
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user's token account (destination)
    #[account(
        mut,
        constraint = user_token_account.owner == authority.key(),
        constraint = user_token_account.mint == mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The lending account's token account (source)
    #[account(
        mut,
        seeds = [b"pool", pool.key().as_ref()],
        bump,
        constraint = pool.mint == mint.key(),
    )]
    pub vault: Account<'info, TokenAccount>,

    /// PDA that records the user's deposit and borrow position.
    #[account(
        mut,
        seeds = [b"user_position", pool.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
        constraint = user_position.pool == pool.key()
            @ crate::error::ErrorCode::InvalidAmount,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let position = &mut ctx.accounts.user_position;

    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);
    require!(
        amount <= position.deposited_amount,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 1. Accrue interest on the pool ────────────────────────────────────────
    let current_ts = Clock::get()?.unix_timestamp;
    pool.accrue_interest(current_ts)?;

    // ── 2. LTV check: can't withdraw if it makes the position underwater ──────
    let remaining_deposit = position
        .deposited_amount
        .checked_sub(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let max_borrowable = remaining_deposit
        .checked_mul(pool.ltv_percent as u64)
        .ok_or(crate::error::ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let current_debt = if pool.total_debt_shares > 0 {
        shares_to_amount(
            position.debt_shares,
            pool.total_borrowed,
            pool.total_debt_shares,
        )
        .ok_or(crate::error::ErrorCode::MathOverflow)?
    } else {
        0
    };

    require!(
        current_debt <= max_borrowable,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 3. Transfer underlying tokens back to user ────────────────────────────
    let pool_bump = pool.bump;
    let authority_key = pool.authority;
    let mint_key = ctx.accounts.mint.key();

    let seeds = &[
        b"lending" as &[u8],
        authority_key.as_ref(),
        mint_key.as_ref(),
        &[pool_bump],
    ];
    let signer = &[&seeds[..]];

    let transfer_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: pool.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().key.clone(),
            transfer_accounts,
            signer,
        ),
        amount,
    )?;

    // ── 4. Update state ───────────────────────────────────────────────────────

    // Proportional LP tokens to remove from the position and pool.
    // lp_owed_reduction = amount * position.lp_tokens_owed / position.deposited_amount
    let lp_owed_reduction = if position.lp_tokens_owed > 0 {
        (amount as u128)
            .checked_mul(position.lp_tokens_owed as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(position.deposited_amount as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)? as u64
    } else {
        0
    };

    // lp_issued_reduction = amount * pool.total_lp_issued / pool.total_deposited
    let lp_issued_reduction = if pool.total_lp_issued > 0 {
        (amount as u128)
            .checked_mul(pool.total_lp_issued as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(pool.total_deposited as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)? as u64
    } else {
        0
    };

    pool.total_deposited = pool
        .total_deposited
        .checked_sub(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    pool.total_lp_issued = pool
        .total_lp_issued
        .checked_sub(lp_issued_reduction)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    position.deposited_amount = remaining_deposit;
    position.lp_tokens_owed = position
        .lp_tokens_owed
        .checked_sub(lp_owed_reduction)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    msg!(
        "Withdrew {} tokens. Reduced LP owed by {}. Remaining deposit: {}",
        amount,
        lp_owed_reduction,
        position.deposited_amount
    );

    Ok(())
}
