use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct PutLp<'info> {
    #[account(
        mut,
        seeds = [b"lending", pool.authority.as_ref(), mint.key().as_ref()],
        bump = pool.bump,
        has_one = mint,
        has_one = lp_mint,
    )]
    pub pool: Account<'info, Pool>,

    /// The mint of the underlying token
    pub mint: Account<'info, Mint>,

    /// The LP token mint for this lending pool
    #[account(
        mut,
        seeds = [b"lp_mint", pool.key().as_ref()],
        bump = pool.lp_mint_bump,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The user burning LP tokens
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user's LP token account (source for burning)
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = authority,
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>,

    /// The user's position — credited with the underlying value of the LP tokens
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"user_position", pool.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn put_lp_handler(ctx: Context<PutLp>, amount: u64) -> Result<()> {
    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);
    require!(
        ctx.accounts.user_lp_token_account.amount >= amount,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 1. Accrue interest on the pool ────────────────────────────────────────
    let current_ts = Clock::get()?.unix_timestamp;
    ctx.accounts.pool.accrue_interest(current_ts)?;

    let pool = &ctx.accounts.pool;
    require!(
        pool.total_lp_issued > 0,
        crate::error::ErrorCode::InvalidAmount
    );

    // ── 2. Calculate underlying tokens this LP amount represents ─────────────
    // underlying = lp_amount * total_deposited / total_lp_issued
    let underlying = (amount as u128)
        .checked_mul(pool.total_deposited as u128)
        .ok_or(crate::error::ErrorCode::MathOverflow)?
        .checked_div(pool.total_lp_issued as u128)
        .ok_or(crate::error::ErrorCode::MathOverflow)? as u64;

    require!(underlying > 0, crate::error::ErrorCode::InvalidAmount);

    // ── 3. Burn LP tokens from user's wallet ──────────────────────────────────
    let burn_accounts = Burn {
        mint: ctx.accounts.lp_mint.to_account_info(),
        from: ctx.accounts.user_lp_token_account.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info().key.clone(),
            burn_accounts,
        ),
        amount,
    )?;

    // ── 4. Update pool state ──────────────────────────────────────────────────
    let pool = &mut ctx.accounts.pool;
    pool.total_lp_issued = pool
        .total_lp_issued
        .checked_sub(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    // ── 5. Credit the user's position ─────────────────────────────────────────
    let position = &mut ctx.accounts.user_position;
    if position.authority == Pubkey::default() {
        **position = UserPosition {
            authority: ctx.accounts.authority.key(),
            pool: ctx.accounts.pool.key(),
            deposited_amount: underlying,
            lp_tokens_owed: 0,
            deposited_at_slot: Clock::get()?.slot,
            debt_shares: 0,
            bump: ctx.bumps.user_position,
        };
    } else {
        position.deposited_amount = position
            .deposited_amount
            .checked_add(underlying)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
    }

    msg!(
        "Put {} LP tokens. Credited {} underlying tokens to position. Pool total_lp_issued: {}",
        amount,
        underlying,
        ctx.accounts.pool.total_lp_issued,
    );

    Ok(())
}
