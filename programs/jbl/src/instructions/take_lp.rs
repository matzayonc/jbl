use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, MintTo, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct TakeLp<'info> {
    #[account(
        mut,
        seeds = [b"lending", pool.authority.as_ref(), mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
        has_one = lp_mint,
    )]
    pub pool: Account<'info, Pool>,

    /// The mint of the underlying token (needed for pool seeds)
    pub mint: Account<'info, Mint>,

    /// The LP token mint for this lending pool
    #[account(
        mut,
        seeds = [b"lp_mint", pool.key().as_ref()],
        bump = pool.lp_mint_bump,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The LP taker
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user position to consume when claiming LP tokens
    #[account(
        mut,
        seeds = [b"user_position", pool.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
        constraint = user_position.pool == pool.key()
            @ crate::error::ErrorCode::InvalidAmount,
        close = authority,
    )]
    pub user_position: Account<'info, UserPosition>,

    /// The user's LP token account (destination)
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = lp_mint,
        associated_token::authority = authority,
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn take_lp_handler(ctx: Context<TakeLp>, amount: u64) -> Result<()> {
    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);
    require!(
        amount <= ctx.accounts.user_position.lp_tokens_owed,
        crate::error::ErrorCode::InvalidAmount
    );

    let lp_tokens_to_mint = amount;

    // The pool PDA is the mint authority for lp_mint
    let authority_key = ctx.accounts.pool.authority;
    let mint_key = ctx.accounts.mint.key();
    let pool_bump = ctx.accounts.pool.bump;
    let seeds = &[
        b"lending" as &[u8],
        authority_key.as_ref(),
        mint_key.as_ref(),
        &[pool_bump],
    ];
    let signer = &[&seeds[..]];

    let mint_accounts = MintTo {
        mint: ctx.accounts.lp_mint.to_account_info(),
        to: ctx.accounts.user_lp_token_account.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            mint_accounts,
            signer,
        ),
        lp_tokens_to_mint,
    )?;

    ctx.accounts.user_position.lp_tokens_owed = ctx
        .accounts
        .user_position
        .lp_tokens_owed
        .checked_sub(lp_tokens_to_mint)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    msg!(
        "Claimed {} LP tokens. Remaining owed: {}.",
        lp_tokens_to_mint,
        ctx.accounts.user_position.lp_tokens_owed,
    );

    Ok(())
}
