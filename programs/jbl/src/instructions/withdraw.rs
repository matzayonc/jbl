use crate::math::shares_to_amount;
use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"lending", authority.key().as_ref(), mint.key().as_ref()],
        bump = pool.bump,
        has_one = authority,
        has_one = mint,
        has_one = lp_mint,
    )]
    pub pool: Account<'info, Pool>,

    /// The mint of the token being withdrawn
    pub mint: Account<'info, Mint>,

    /// The LP token mint for this lending pool
    #[account(
        mut,
        seeds = [b"lp_mint", pool.key().as_ref()],
        bump = pool.lp_mint_bump,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The authority that owns this lending account
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user's token account (destination)
    #[account(
        mut,
        constraint = user_token_account.owner == authority.key(),
        constraint = user_token_account.mint == mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The user's LP token account (source for burning)
    #[account(
        mut,
        constraint = user_lp_token_account.owner == authority.key(),
        constraint = user_lp_token_account.mint == lp_mint.key(),
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>,

    /// The lending account's token account (source)
    #[account(
        mut,
        seeds = [b"pool", pool.key().as_ref()],
        bump,
        constraint = pool.mint == mint.key(),
    )]
    pub vault: Account<'info, TokenAccount>,

    /// PDA that records the user's deposit and pending LP tokens.
    #[account(
        mut,
        seeds = [b"user_position", pool.key().as_ref(), authority.key().as_ref()],
        bump = user_position.bump,
        has_one = authority,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Program<'info, Token>,
}

pub fn withdraw_handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let position = &mut ctx.accounts.user_position;

    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);
    require!(
        amount <= position.deposited_amount,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 1. Accrue interest on the pool ────────────────────────────────────────
    let current_ts = Clock::get()?.unix_timestamp;
    pool.accrue_interest(current_ts)?;

    // ── 2. LTV check: can't withdraw if it makes the position underwater ──────
    let remaining_deposit = position
        .deposited_amount
        .checked_sub(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let max_borrowable = remaining_deposit
        .checked_mul(pool.ltv_percent as u64)
        .ok_or(crate::error::ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let current_debt = if pool.total_debt_shares > 0 {
        shares_to_amount(
            position.debt_shares,
            pool.total_borrowed,
            pool.total_debt_shares,
        )
        .ok_or(crate::error::ErrorCode::MathOverflow)?
    } else {
        0
    };

    require!(
        current_debt <= max_borrowable,
        crate::error::ErrorCode::InsufficientFunds
    );

    // ── 3. Calculate LP tokens to burn ────────────────────────────────────────
    // ratio = total_lp_issued / total_deposited
    // lp_to_burn = amount * total_lp_issued / total_deposited
    let lp_to_burn = (amount as u128)
        .checked_mul(pool.total_lp_issued as u128)
        .ok_or(crate::error::ErrorCode::MathOverflow)?
        .checked_div(pool.total_deposited as u128)
        .ok_or(crate::error::ErrorCode::MathOverflow)? as u64;

    // ── 4. Burn LP tokens ─────────────────────────────────────────────────────
    // Prefer burning from pending lp_tokens_owed first
    let from_owed = lp_to_burn.min(position.lp_tokens_owed);
    position.lp_tokens_owed = position
        .lp_tokens_owed
        .checked_sub(from_owed)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    let remaining_to_burn = lp_to_burn
        .checked_sub(from_owed)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;

    if remaining_to_burn > 0 {
        // Burn from user's SPL token account
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
            remaining_to_burn,
        )?;
    }

    // ── 5. Transfer underlying tokens back to user ────────────────────────────
    let pool_bump = pool.bump;
    let authority_key = ctx.accounts.authority.key();
    let mint_key = ctx.accounts.mint.key();

    let seeds = &[
        b"lending" as &[u8],
        authority_key.as_ref(),
        mint_key.as_ref(),
        &[pool_bump],
    ];
    let signer = &[&seeds[..]];

    let transfer_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: pool.to_account_info(),
    };
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info().key.clone(),
            transfer_accounts,
            signer,
        ),
        amount,
    )?;

    // ── 6. Update state ───────────────────────────────────────────────────────
    pool.total_deposited = pool
        .total_deposited
        .checked_sub(amount)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    pool.total_lp_issued = pool
        .total_lp_issued
        .checked_sub(lp_to_burn)
        .ok_or(crate::error::ErrorCode::MathOverflow)?;
    position.deposited_amount = remaining_deposit;

    msg!(
        "Withdrew {} tokens. Burned {} LP tokens. Remaining deposit: {}",
        amount,
        lp_to_burn,
        position.deposited_amount
    );

    Ok(())
}
