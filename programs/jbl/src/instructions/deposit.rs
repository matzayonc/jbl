use crate::state::{Pool, UserPosition};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub pool: AccountLoader<'info, Pool>,

    /// The mint of the token being deposited
    pub mint: Account<'info, Mint>,

    /// The depositor
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
        seeds = [b"pool", pool.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// PDA that records the user's deposit and pending LP tokens.
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"user_position", pool.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub user_position: Account<'info, UserPosition>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);

    // Pre-calculate LP tokens owed at the current pool ratio.
    let lp_tokens_owed = {
        let pool = ctx.accounts.pool.load()?;
        if pool.total_deposited == 0 {
            amount
        } else {
            amount
                .checked_mul(pool.total_lp_issued)
                .ok_or(crate::error::ErrorCode::MathOverflow)?
                .checked_div(pool.total_deposited)
                .ok_or(crate::error::ErrorCode::MathOverflow)?
        }
    };

    require!(lp_tokens_owed > 0, crate::error::ErrorCode::InvalidAmount);

    // Transfer SPL tokens from user to lending vault.
    let transfer_accounts = anchor_spl::token::Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };
    anchor_spl::token::transfer(
        CpiContext::new(
            *ctx.accounts.token_program.to_account_info().key,
            transfer_accounts,
        ),
        amount,
    )?;

    // Update pool state.
    let (total_deposited, total_lp_issued) = {
        let mut pool = ctx.accounts.pool.load_mut()?;
        pool.total_deposited = pool
            .total_deposited
            .checked_add(amount)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        pool.total_lp_issued = pool
            .total_lp_issued
            .checked_add(lp_tokens_owed)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        (pool.total_deposited, pool.total_lp_issued)
    };

    // Initialize or accumulate into the user position PDA.
    let position = &mut ctx.accounts.user_position;
    if position.authority == Pubkey::default() {
        **position = UserPosition {
            authority: ctx.accounts.authority.key(),
            pool: ctx.accounts.pool.key(),
            deposited_amount: amount,
            lp_tokens_owed,
            debt_shares: 0,
            bump: ctx.bumps.user_position,
        };
    } else {
        position.deposited_amount = position
            .deposited_amount
            .checked_add(amount)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        position.lp_tokens_owed = position
            .lp_tokens_owed
            .checked_add(lp_tokens_owed)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
    }

    msg!(
        "Deposited {} tokens. LP tokens owed: {}. Total deposited: {}, Total LP issued: {}",
        amount,
        lp_tokens_owed,
        total_deposited,
        total_lp_issued,
    );

    Ok(())
}
