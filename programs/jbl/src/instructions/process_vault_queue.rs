use crate::state::Pool;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

/// Anyone may call this to advance the pool's lend withdrawal queue by one entry.
/// Accounts must match the head entry's `requester`.
/// Returns `WithdrawalQueueEmpty` if there is nothing to process.
/// Returns `InsufficientFunds` (without dequeueing) if the lend vault still lacks
/// enough tokens to cover the head entry's shares.
#[derive(Accounts)]
pub struct ProcessVaultQueueEntry<'info> {
    #[account(mut)]
    pub pool: AccountLoader<'info, Pool>,

    /// CHECK: Signer-only PDA — no data stored; signs lend-vault-transfer CPIs.
    #[account(
        seeds = [b"state"],
        bump,
    )]
    pub state: UncheckedAccount<'info>,

    /// The lend token mint accepted by this pool.
    pub lend_mint: Account<'info, Mint>,

    /// The requester's lend-token destination account.
    /// Must be owned by the pubkey stored in the head queue entry.
    /// Created if it doesn't exist yet.
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = lend_mint,
        associated_token::authority = requester,
    )]
    pub requester_lend_token_account: Account<'info, TokenAccount>,

    /// CHECK: The requester recorded in the head queue entry.
    /// Validated in the handler against the stored pubkey.
    pub requester: UncheckedAccount<'info>,

    /// The pool's lend vault — holds lend tokens; source for withdrawal.
    #[account(
        mut,
        seeds = [b"lend_vault", pool.key().as_ref()],
        bump,
        constraint = lend_vault.mint == lend_mint.key()
            @ crate::error::ErrorCode::InvalidAmount,
    )]
    pub lend_vault: Account<'info, TokenAccount>,

    /// Pays for any account creation (requester ATA init_if_needed).
    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn process_vault_queue_entry_handler(ctx: Context<ProcessVaultQueueEntry>) -> Result<()> {
    // ── 1. Peek at head entry ─────────────────────────────────────────────────
    let entry = {
        let pool = ctx.accounts.pool.load()?;
        require!(
            pool.withdrawal_queue.head != pool.withdrawal_queue.tail,
            crate::error::ErrorCode::WithdrawalQueueEmpty
        );
        pool.withdrawal_queue.entries[pool.withdrawal_queue.head as usize]
    };

    // ── 2. Validate the requester account matches the entry ───────────────────
    require!(
        ctx.accounts.requester.key() == entry.requester,
        crate::error::ErrorCode::QueueEntryMismatch
    );

    // ── 3. Convert LP shares → lend tokens using total_lend_deposited ─────────
    // `entry.amount` stores the LP shares burned at `leave` time.
    // Using total_lend_deposited (not vault_balance) gives each share its full
    // proportional claim; the vault-balance liquidity check in step 4 ensures
    // we only process when liquidity is available.
    let shares = entry.amount;
    let vault_balance = ctx.accounts.lend_vault.amount;

    let withdraw_amount = {
        let pool = ctx.accounts.pool.load()?;
        require!(
            pool.total_lp_issued > 0,
            crate::error::ErrorCode::InvalidAmount
        );
        (shares as u128)
            .checked_mul(pool.total_lend_deposited as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(pool.total_lp_issued as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)? as u64
    };

    // ── 4. Check liquidity — do NOT dequeue on failure ────────────────────────
    require!(
        vault_balance >= withdraw_amount,
        crate::error::ErrorCode::InsufficientFunds
    );
    require!(withdraw_amount > 0, crate::error::ErrorCode::InvalidAmount);

    // ── 5. Dequeue, decrement total_lp_issued and total_lend_deposited ────────
    {
        let mut pool = ctx.accounts.pool.load_mut()?;
        pool.withdrawal_queue.pop()?;
        pool.total_lp_issued = pool
            .total_lp_issued
            .checked_sub(shares)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
        pool.total_lend_deposited = pool
            .total_lend_deposited
            .checked_sub(withdraw_amount.min(pool.total_lend_deposited))
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
    }

    // ── 6. Transfer lend tokens to requester (state PDA is vault authority) ───
    let state_bump = ctx.bumps.state;
    let seeds = &[b"state" as &[u8], &[state_bump]];
    let signer = &[&seeds[..]];

    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            anchor_spl::token::Transfer {
                from: ctx.accounts.lend_vault.to_account_info(),
                to: ctx.accounts.requester_lend_token_account.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            signer,
        ),
        withdraw_amount,
    )?;

    let total_lp = ctx.accounts.pool.load()?.total_lp_issued;
    msg!(
        "ProcessVaultQueue: fulfilled {} LP shares → {} lend tokens for {}. total_lp_issued remaining: {}",
        shares,
        withdraw_amount,
        entry.requester,
        total_lp,
    );

    Ok(())
}
