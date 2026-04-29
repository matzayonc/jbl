use crate::state::{UserPosition, LendingAccount};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, MintTo, Token, TokenAccount};

#[derive(Accounts)]
pub struct TakeLp<'info> {
    #[account(
        mut,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump = lending_account.bump,
        has_one = authority,
        has_one = mint,
        has_one = lp_mint,
    )]
    pub lending_account: Account<'info, LendingAccount>,

    /// The mint of the underlying token (needed for lending_account seeds)
    pub mint: Account<'info, Mint>,

    /// The LP token mint for this lending pool
    #[account(
        mut,
        seeds = [b"lp_mint", lending_account.key().as_ref()],
        bump = lending_account.lp_mint_bump,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The authority claiming their LP tokens
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user position to consume when claiming LP tokens
    #[account(
        mut,
        seeds = [b"user_position", lending_account.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
        constraint = user_position.lending_account == lending_account.key()
            @ crate::error::ErrorCode::InvalidAmount,
        close = authority,
    )]
    pub user_position: Account<'info, UserPosition>,

    /// The user's LP token account (destination)
    #[account(
        mut,
        constraint = user_lp_token_account.owner == authority.key(),
        constraint = user_lp_token_account.mint == lp_mint.key(),
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn take_lp_handler(ctx: Context<TakeLp>) -> Result<()> {
    let lp_tokens_to_mint = ctx.accounts.user_position.lp_tokens_owed;

    require!(
        lp_tokens_to_mint > 0,
        crate::error::ErrorCode::InvalidAmount
    );

    // The lending_account PDA is the mint authority for lp_mint
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();
    let lending_account_bump = ctx.accounts.lending_account.bump;
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

    msg!(
        "Claimed {} LP tokens from deposit receipt. Deposited amount was {}.",
        lp_tokens_to_mint,
        ctx.accounts.user_position.deposited_amount,
    );

    Ok(())
}
