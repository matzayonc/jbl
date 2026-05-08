use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct MockSwap<'info> {
    /// The authority over both mints — must sign.
    pub mint_authority: Signer<'info>,

    /// The mint to burn from. Caller must be its mint authority.
    #[account(
        mut,
        constraint = mint_in.mint_authority == COption::Some(mint_authority.key()) @ ErrorCode::Unauthorized,
    )]
    pub mint_in: Account<'info, Mint>,

    /// The mint to issue tokens from. Caller must be its mint authority.
    #[account(
        mut,
        constraint = mint_out.mint_authority == COption::Some(mint_authority.key()) @ ErrorCode::Unauthorized,
    )]
    pub mint_out: Account<'info, Mint>,

    /// The caller's token account to burn from.
    #[account(
        mut,
        constraint = user_token_in.owner == mint_authority.key() @ ErrorCode::Unauthorized,
        constraint = user_token_in.mint == mint_in.key() @ ErrorCode::InvalidMint,
    )]
    pub user_token_in: Account<'info, TokenAccount>,

    /// The caller's token account to receive minted tokens.
    #[account(
        mut,
        constraint = user_token_out.owner == mint_authority.key() @ ErrorCode::Unauthorized,
        constraint = user_token_out.mint == mint_out.key() @ ErrorCode::InvalidMint,
    )]
    pub user_token_out: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/// Mock 1:1 swap: burn `amount` of `mint_in` from the caller, mint `amount` of `mint_out`
/// to the caller. The caller must be the mint authority of both mints.
///
/// This instruction exists solely for testing and local-validator faucet scenarios.
/// It must never be deployed to mainnet.
pub fn mock_swap_handler(ctx: Context<MockSwap>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);

    // Burn `amount` of mint_in from the caller's account.
    anchor_spl::token::burn(
        CpiContext::new(
            *ctx.accounts.token_program.to_account_info().key,
            anchor_spl::token::Burn {
                mint: ctx.accounts.mint_in.to_account_info(),
                from: ctx.accounts.user_token_in.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
        ),
        amount,
    )?;

    // Mint `amount` of mint_out to the caller's account.
    anchor_spl::token::mint_to(
        CpiContext::new(
            *ctx.accounts.token_program.to_account_info().key,
            anchor_spl::token::MintTo {
                mint: ctx.accounts.mint_out.to_account_info(),
                to: ctx.accounts.user_token_out.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!(
        "MockSwap: burned {} of {}, minted {} of {}",
        amount,
        ctx.accounts.mint_in.key(),
        amount,
        ctx.accounts.mint_out.key(),
    );

    Ok(())
}
