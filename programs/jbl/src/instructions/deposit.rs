use crate::state::{DepositReceipt, LendingAccount};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump = lending_account.bump,
        has_one = authority,
        has_one = mint,
    )]
    pub lending_account: Account<'info, LendingAccount>,

    /// The mint of the token being deposited
    pub mint: Account<'info, Mint>,

    /// The authority that owns this lending account
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user's token account (source)
    #[account(
        mut,
        constraint = user_token_account.owner == authority.key(),
        constraint = user_token_account.mint == mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The lending account's token account (destination)
    #[account(
        mut,
        seeds = [b"lending_vault", lending_account.key().as_ref()],
        bump,
        constraint = lending_vault.mint == mint.key(),
    )]
    pub lending_vault: Account<'info, TokenAccount>,

    /// PDA receipt that records pending deposits.
    /// Created on first deposit; subsequent deposits accumulate into it.
    /// The user can later call `take_lp` to claim LP tokens, or use this receipt as collateral.
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + DepositReceipt::INIT_SPACE,
        seeds = [b"deposit_receipt", lending_account.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub deposit_receipt: Account<'info, DepositReceipt>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let lending_account = &mut ctx.accounts.lending_account;

    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);

    // Pre-calculate LP tokens owed and lock them in at the current pool ratio.
    // First deposit: 1:1; subsequent: proportional to pool share.
    let lp_tokens_owed = if lending_account.total_deposited == 0 {
        amount
    } else {
        amount
            .checked_mul(lending_account.total_lp_issued)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(lending_account.total_deposited)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
    };

    require!(lp_tokens_owed > 0, crate::error::ErrorCode::InvalidAmount);

    // Transfer SPL tokens from user to lending vault
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
        amount,
    )?;

    // Update lending account state (reserve total_lp_issued so future ratios stay consistent)
    lending_account.total_deposited = lending_account
        .total_deposited
        .checked_add(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    lending_account.total_lp_issued = lending_account
        .total_lp_issued
        .checked_add(lp_tokens_owed)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    lending_account.last_update_slot = Clock::get()?.slot;

    // Initialise or accumulate into the deposit receipt PDA
    let receipt = &mut ctx.accounts.deposit_receipt;
    if receipt.authority == Pubkey::default() {
        // First deposit: initialise all fields
        receipt.authority = ctx.accounts.authority.key();
        receipt.lending_account = ctx.accounts.lending_account.key();
        receipt.deposited_amount = amount;
        receipt.lp_tokens_owed = lp_tokens_owed;
        receipt.deposited_at_slot = Clock::get()?.slot;
        receipt.bump = ctx.bumps.deposit_receipt;
    } else {
        // Subsequent deposit: accumulate
        receipt.deposited_amount = receipt
            .deposited_amount
            .checked_add(amount)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        receipt.lp_tokens_owed = receipt
            .lp_tokens_owed
            .checked_add(lp_tokens_owed)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
    }

    msg!(
        "Deposited {} tokens. LP tokens owed: {}. Total deposited: {}, Total LP issued: {}",
        amount,
        lp_tokens_owed,
        ctx.accounts.lending_account.total_deposited,
        ctx.accounts.lending_account.total_lp_issued,
    );

    Ok(())
}
