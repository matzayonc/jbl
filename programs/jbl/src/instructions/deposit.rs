use crate::state::LendingAccount;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, MintTo, Token, TokenAccount};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump = lending_account.bump,
        has_one = authority,
        has_one = mint,
        has_one = lp_mint,
    )]
    pub lending_account: Account<'info, LendingAccount>,

    /// The mint of the token being deposited
    pub mint: Account<'info, Mint>,

    /// The LP token mint for this lending pool
    #[account(
        mut,
        seeds = [b"lp_mint", lending_account.key().as_ref()],
        bump = lending_account.lp_mint_bump,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The authority that owns this lending account
    pub authority: Signer<'info>,

    /// The user's token account (source)
    #[account(
        mut,
        constraint = user_token_account.owner == authority.key(),
        constraint = user_token_account.mint == mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The user's LP token account (destination for LP tokens)
    #[account(
        mut,
        constraint = user_lp_token_account.owner == authority.key(),
        constraint = user_lp_token_account.mint == lp_mint.key(),
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>,

    /// The lending account's token account (destination)
    #[account(
        mut,
        seeds = [b"lending_vault", lending_account.key().as_ref()],
        bump,
        constraint = lending_vault.mint == mint.key(),
    )]
    pub lending_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let lending_account = &mut ctx.accounts.lending_account;

    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);

    // Calculate LP tokens to mint
    // If first deposit (total_deposited = 0), mint 1:1 ratio
    // Otherwise, mint based on current pool ratio
    let lp_tokens_to_mint = if lending_account.total_deposited == 0 {
        // First deposit: 1:1 ratio
        amount
    } else {
        // Calculate LP tokens based on pool share
        // lp_tokens = amount * total_lp_issued / total_deposited
        amount
            .checked_mul(lending_account.total_lp_issued)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(lending_account.total_deposited)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
    };

    require!(
        lp_tokens_to_mint > 0,
        crate::error::ErrorCode::InvalidAmount
    );

    // Extract bump and key before mutable borrows
    let lending_account_bump = lending_account.bump;
    let lending_account_key = lending_account.key();
    let _ = lending_account;

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

    // Mint LP tokens to the user
    // The lending_account PDA is the mint authority for lp_mint
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[
        b"lending" as &[u8],
        authority_key.as_ref(),
        mint_key.as_ref(),
        &[lending_account_bump],
    ];
    let signer = &[&seeds[..]];

    let mint_accounts = MintTo {
        mint: ctx.accounts.lp_mint.to_account_info(),
        to: ctx.accounts.user_lp_token_account.to_account_info(),
        authority: ctx.accounts.lending_account.to_account_info(),
    };
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            mint_accounts,
            signer,
        ),
        lp_tokens_to_mint,
    )?;

    // Update lending account state
    let _ = lending_account_key; // suppress unused warning
    let lending_account = &mut ctx.accounts.lending_account;
    lending_account.total_deposited = lending_account
        .total_deposited
        .checked_add(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    lending_account.total_lp_issued = lending_account
        .total_lp_issued
        .checked_add(lp_tokens_to_mint)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    lending_account.last_update_slot = Clock::get()?.slot;

    msg!(
        "Deposited {} tokens, minted {} LP tokens. Total deposited: {}, Total LP issued: {}",
        amount,
        lp_tokens_to_mint,
        lending_account.total_deposited,
        lending_account.total_lp_issued
    );

    Ok(())
}
