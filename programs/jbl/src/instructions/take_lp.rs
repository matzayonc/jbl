use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, MintTo, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct TakeLp<'info> {
    #[account(mut)]
    pub pool: AccountLoader<'info, Pool>,

    /// CHECK: PDA used as LP mint authority for minting.
    #[account(
        seeds = [b"pool_signer", pool.key().as_ref()],
        bump,
    )]
    pub pool_signer: UncheckedAccount<'info>,

    /// The mint of the underlying token (needed for pool seeds)
    pub mint: Account<'info, Mint>,

    /// The LP token mint for this lending pool
    #[account(
        mut,
        seeds = [b"lp_mint", pool.key().as_ref()],
        bump,
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

    let pool_signer_bump = ctx.accounts.pool.load()?.pool_signer_bump;
    let pool_key = ctx.accounts.pool.key();
    let seeds = &[b"pool_signer" as &[u8], pool_key.as_ref(), &[pool_signer_bump]];
    let signer = &[&seeds[..]];

    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: ctx.accounts.pool_signer.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    ctx.accounts.user_position.lp_tokens_owed = ctx
        .accounts
        .user_position
        .lp_tokens_owed
        .checked_sub(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    msg!(
        "Claimed {} LP tokens. Remaining owed: {}.",
        amount,
        ctx.accounts.user_position.lp_tokens_owed,
    );

    Ok(())
}
