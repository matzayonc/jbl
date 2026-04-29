use crate::math::compute_interest;
use crate::state::{UserPosition, LendingAccount};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Repay<'info> {
    #[account(
        mut,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump = lending_account.bump,
        has_one = authority,
        has_one = mint,
    )]
    pub lending_account: Account<'info, LendingAccount>,

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
        seeds = [b"lending_vault", lending_account.key().as_ref()],
        bump,
        constraint = lending_vault.mint == mint.key(),
    )]
    pub lending_vault: Account<'info, TokenAccount>,

    /// The user's position — borrow fields are reset on successful repay
    #[account(
        mut,
        seeds = [b"user_position", lending_account.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
        constraint = user_position.lending_account == lending_account.key()
            @ crate::error::ErrorCode::NoBorrowFound,
        constraint = user_position.principal > 0
            @ crate::error::ErrorCode::NoBorrowFound,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn repay_handler(ctx: Context<Repay>) -> Result<()> {
    let current_ts = Clock::get()?.unix_timestamp;
    let receipt = &ctx.accounts.user_position;

    let principal = receipt.principal;
    let rate_bps = receipt.interest_rate_bps;
    let elapsed_secs = (current_ts.saturating_sub(receipt.borrowed_at_ts)).max(0) as u64;

    let interest = compute_interest(principal, rate_bps, elapsed_secs)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let total_due = principal
        .checked_add(interest)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    require!(
        ctx.accounts.user_token_account.amount >= total_due,
        crate::error::ErrorCode::InsufficientFunds
    );

    // Transfer principal + interest from user back to vault
    let transfer_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.lending_vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    anchor_spl::token::transfer(
        CpiContext::new(
            *ctx.accounts.token_program.to_account_info().key,
            transfer_accounts,
        ),
        total_due,
    )?;

    // Update lending account — reduce total_borrowed by principal, interest stays as vault profit
    let lending_account = &mut ctx.accounts.lending_account;
    lending_account.total_borrowed = lending_account
        .total_borrowed
        .checked_sub(principal)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    lending_account.last_update_slot = Clock::get()?.slot;

    // Reset borrow fields on the position (deposit info is preserved)
    let user_position = &mut ctx.accounts.user_position;
    user_position.principal = 0;
    user_position.interest_rate_bps = 0;
    user_position.borrowed_at_ts = 0;

    msg!(
        "Repaid {} principal + {} interest ({} bps over {} seconds) = {} total. Total borrowed: {}",
        principal,
        interest,
        rate_bps,
        elapsed_secs,
        total_due,
        lending_account.total_borrowed,
    );

    Ok(())
}
