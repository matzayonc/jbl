use crate::state::{UserPosition, LendingAccount};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(
        mut,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump = lending_account.bump,
        has_one = authority,
        has_one = mint,
    )]
    pub lending_account: Account<'info, LendingAccount>,

    /// The mint of the token being borrowed
    pub mint: Account<'info, Mint>,

    /// The authority that owns this lending account
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
        seeds = [b"lending_vault", lending_account.key().as_ref()],
        bump,
        constraint = lending_vault.mint == mint.key(),
    )]
    pub lending_vault: Account<'info, TokenAccount>,

    /// The user's position — holds deposit collateral and active borrow fields.
    /// Must already exist (user must have deposited first).
    #[account(
        mut,
        seeds = [b"user_position", lending_account.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
        constraint = user_position.lending_account == lending_account.key()
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
    let lending_account = &ctx.accounts.lending_account;

    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);

    // Check if there are sufficient funds in the vault
    require!(
        ctx.accounts.lending_vault.amount >= amount,
        crate::error::ErrorCode::InsufficientFunds
    );

    // Calculate max borrowable amount based on user's deposited collateral
    let max_borrowable = ctx
        .accounts
        .user_position
        .deposited_amount
        .checked_mul(lending_account.ltv_percent as u64)
        .ok_or(crate::error::ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let available_to_borrow = max_borrowable
        .checked_sub(lending_account.total_borrowed)
        .ok_or(crate::error::ErrorCode::InsufficientFunds)?;

    require!(
        amount <= available_to_borrow,
        crate::error::ErrorCode::InsufficientFunds
    );

    let current_slot = Clock::get()?.slot;
    let current_ts = Clock::get()?.unix_timestamp;
    let interest_rate_bps = lending_account.borrow_fee_bps; // u32

    // Record the open borrow position in the user's position account
    let user_position = &mut ctx.accounts.user_position;
    user_position.principal = amount;
    user_position.interest_rate_bps = interest_rate_bps;
    user_position.borrowed_at_ts = current_ts;

    // Extract seeds before mutable borrow of lending_account
    let lending_account_bump = ctx.accounts.lending_account.bump;
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();

    // Transfer the full principal to the user (interest is charged at repayment)
    let seeds = &[
        b"lending" as &[u8],
        authority_key.as_ref(),
        mint_key.as_ref(),
        &[lending_account_bump],
    ];
    let signer = &[&seeds[..]];

    let transfer_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.lending_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.lending_account.to_account_info(),
    };
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            transfer_accounts,
            signer,
        ),
        amount,
    )?;

    // Update lending account state
    let lending_account = &mut ctx.accounts.lending_account;
    lending_account.total_borrowed = lending_account
        .total_borrowed
        .checked_add(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    lending_account.last_update_slot = current_slot;

    msg!(
        "Borrowed {} tokens at {} bps/year. Interest accrues from unix ts {}. Total borrowed: {}",
        amount,
        interest_rate_bps,
        current_ts,
        lending_account.total_borrowed,
    );

    Ok(())
}
