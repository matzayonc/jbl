use crate::state::{DepositReceipt, LendingAccount};
use anchor_lang::prelude::*;
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
        seeds = [b"lending_vault", lending_account.key().as_ref()],
        bump,
        constraint = lending_vault.mint == mint.key(),
    )]
    pub lending_vault: Account<'info, TokenAccount>,

    /// The user's deposit receipt — used as collateral for this borrow
    #[account(
        seeds = [b"deposit_receipt", lending_account.key().as_ref(), authority.key().as_ref()],
        bump = deposit_receipt.bump,
        has_one = authority,
        constraint = deposit_receipt.lending_account == lending_account.key()
            @ crate::error::ErrorCode::InvalidAmount,
    )]
    pub deposit_receipt: Account<'info, DepositReceipt>,

    pub token_program: Program<'info, Token>,
}

pub fn borrow_handler(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    let lending_account = &mut ctx.accounts.lending_account;

    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);

    // Check if there are sufficient funds in the vault
    require!(
        ctx.accounts.lending_vault.amount >= amount,
        crate::error::ErrorCode::InsufficientFunds
    );

    // Calculate max borrowable amount based on user's deposited collateral (not pool total)
    let max_borrowable = ctx
        .accounts
        .deposit_receipt
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

    // Extract bump and key before mutable borrows
    let lending_account_bump = lending_account.bump;
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();
    let _ = lending_account;

    // Transfer SPL tokens from lending vault to user
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

    lending_account.last_update_slot = Clock::get()?.slot;

    msg!(
        "Borrowed {} tokens. Total borrowed: {}, Available to borrow: {}",
        amount,
        lending_account.total_borrowed,
        available_to_borrow.checked_sub(amount).unwrap_or(0)
    );

    Ok(())
}
