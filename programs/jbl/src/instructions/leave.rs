use crate::{state::Vault, withdrawal_queue::WithdrawalQueueEntry};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Burn, Mint, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Leave<'info> {
    #[account(mut)]
    pub vault: AccountLoader<'info, Vault>,

    /// CHECK: Signer-only PDA — no data stored; signs vault-transfer CPIs.
    #[account(
        seeds = [b"state"],
        bump,
    )]
    pub state: UncheckedAccount<'info>,

    /// The lent token mint accepted by the vault.
    pub lent_mint: Account<'info, Mint>,

    /// The vault's LP token mint. Created by `create_vault` as a PDA.
    #[account(
        mut,
        seeds = [b"lp_mint", vault.key().as_ref()],
        bump,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The withdrawer.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user's LP token account (source for burning).
    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = authority,
    )]
    pub user_lp_token_account: Account<'info, TokenAccount>,

    /// The user's lent-token account (destination) — created if it doesn't exist.
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = lent_mint,
        associated_token::authority = authority,
    )]
    pub user_lent_token_account: Account<'info, TokenAccount>,

    /// Vault token account A — holds lent tokens; source for withdrawal.
    #[account(
        mut,
        seeds = [b"vault_tokens_a", vault.key().as_ref()],
        bump,
        constraint = vault_token_account_a.mint == lent_mint.key()
            @ crate::error::ErrorCode::InvalidAmount,
    )]
    pub vault_token_account_a: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn leave_handler(ctx: Context<Leave>, shares: u64) -> Result<()> {
    require!(shares > 0, crate::error::ErrorCode::InvalidAmount);
    require!(
        ctx.accounts.user_lp_token_account.amount >= shares,
        crate::error::ErrorCode::InsufficientFunds
    );

    // Validate lent_mint matches what is stored in the vault.
    {
        let vault = ctx.accounts.vault.load()?;
        require!(
            ctx.accounts.lent_mint.key() == vault.lent_mint,
            crate::error::ErrorCode::InvalidAmount
        );
        require!(
            vault.total_shares > 0,
            crate::error::ErrorCode::InvalidAmount
        );
    }

    // ── 1. Burn LP tokens from user (always) ─────────────────────────────────
    // Burning here prevents double-use of the shares while the request sits in
    // the queue. `total_shares` is NOT decremented yet — the queued shares keep
    // accruing value relative to the vault balance until they are processed.
    anchor_spl::token::burn(
        CpiContext::new(
            *ctx.accounts.token_program.to_account_info().key,
            Burn {
                mint: ctx.accounts.lp_mint.to_account_info(),
                from: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        shares,
    )?;

    // ── 2. Decide: immediate withdrawal or enqueue ────────────────────────────
    // Liquidity is measured in LP shares outstanding vs. vault token balance.
    // We go immediate only when the queue is empty AND the vault currently holds
    // enough tokens to cover the shares' proportional value.
    let vault_balance = ctx.accounts.vault_token_account_a.amount;

    let immediate = {
        let vault = ctx.accounts.vault.load()?;
        let queue_is_empty = vault.withdrawal_queue.head == vault.withdrawal_queue.tail;
        // Proportional lent tokens for `shares` at current vault balance.
        let lent_for_shares = (shares as u128)
            .checked_mul(vault_balance as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(vault.total_shares as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)? as u64;
        queue_is_empty && vault_balance >= lent_for_shares && lent_for_shares > 0
    };

    if immediate {
        // ── 3a. Immediate: convert shares → lent tokens and transfer ─────────
        let withdraw_amount = {
            let vault = ctx.accounts.vault.load()?;
            (shares as u128)
                .checked_mul(vault_balance as u128)
                .ok_or(crate::error::ErrorCode::MathOverflow)?
                .checked_div(vault.total_shares as u128)
                .ok_or(crate::error::ErrorCode::MathOverflow)? as u64
        };

        // Decrement total_shares only on the immediate path.
        {
            let mut vault = ctx.accounts.vault.load_mut()?;
            vault.total_shares = vault
                .total_shares
                .checked_sub(shares)
                .ok_or(crate::error::ErrorCode::MathOverflow)?;
        }

        let state_bump = ctx.bumps.state;
        let seeds = &[b"state" as &[u8], &[state_bump]];
        let signer = &[&seeds[..]];

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                *ctx.accounts.token_program.to_account_info().key,
                anchor_spl::token::Transfer {
                    from: ctx.accounts.vault_token_account_a.to_account_info(),
                    to: ctx.accounts.user_lent_token_account.to_account_info(),
                    authority: ctx.accounts.state.to_account_info(),
                },
                signer,
            ),
            withdraw_amount,
        )?;

        msg!(
            "Leave: burned {} LP shares, withdrew {} lent tokens immediately. Total shares: {}",
            shares,
            withdraw_amount,
            ctx.accounts.vault.load()?.total_shares,
        );
    } else {
        // ── 3b. Queued: store shares in queue; total_shares unchanged ─────────
        // Conversion to lent tokens happens when the queue entry is processed,
        // so the shares continue to reflect their accrued value at that time.
        let mut vault = ctx.accounts.vault.load_mut()?;
        vault.withdrawal_queue.push(WithdrawalQueueEntry {
            requester: ctx.accounts.authority.key(),
            amount: shares,
        })?;
        msg!(
            "Leave: burned {} LP shares, enqueued for later withdrawal. Total shares: {}",
            shares,
            vault.total_shares,
        );
    }

    Ok(())
}
