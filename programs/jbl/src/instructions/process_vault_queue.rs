use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

/// Anyone may call this to advance the vault withdrawal queue by one entry.
/// Accounts must match the head entry's `requester`.
/// Returns `WithdrawalQueueEmpty` if there is nothing to process.
/// Returns `InsufficientFunds` (without dequeueing) if the vault still lacks
/// enough lent tokens to cover the head entry's shares.
#[derive(Accounts)]
pub struct ProcessVaultQueueEntry<'info> {
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

    /// The requester's lent-token destination account.
    /// Must be owned by the pubkey stored in the head queue entry.
    /// Created if it doesn't exist yet.
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = lent_mint,
        associated_token::authority = requester,
    )]
    pub requester_lent_token_account: Account<'info, TokenAccount>,

    /// CHECK: The requester recorded in the head queue entry.
    /// Validated in the handler against the stored pubkey.
    pub requester: UncheckedAccount<'info>,

    /// Vault token account A — holds lent tokens; source for withdrawal.
    #[account(
        mut,
        seeds = [b"vault_tokens_a", vault.key().as_ref()],
        bump,
        constraint = vault_token_account_a.mint == lent_mint.key()
            @ crate::error::ErrorCode::InvalidAmount,
    )]
    pub vault_token_account_a: Account<'info, TokenAccount>,

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
        let vault = ctx.accounts.vault.load()?;
        require!(
            vault.withdrawal_queue.head != vault.withdrawal_queue.tail,
            crate::error::ErrorCode::WithdrawalQueueEmpty
        );
        vault.withdrawal_queue.entries[vault.withdrawal_queue.head as usize]
    };

    // ── 2. Validate the requester account matches the entry ───────────────────
    require!(
        ctx.accounts.requester.key() == entry.requester,
        crate::error::ErrorCode::QueueEntryMismatch
    );

    // ── 3. Convert shares → lent tokens at the current vault ratio ───────────
    // `entry.amount` stores shares (LP units burned at `leave` time).
    // Converting here lets the pending shares accrue value as interest flows in.
    let shares = entry.amount;
    let vault_balance = ctx.accounts.vault_token_account_a.amount;

    let withdraw_amount = {
        let vault = ctx.accounts.vault.load()?;
        require!(
            vault.total_shares > 0,
            crate::error::ErrorCode::InvalidAmount
        );
        (shares as u128)
            .checked_mul(vault_balance as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)?
            .checked_div(vault.total_shares as u128)
            .ok_or(crate::error::ErrorCode::MathOverflow)? as u64
    };

    // ── 4. Check liquidity — do NOT dequeue on failure ────────────────────────
    require!(
        vault_balance >= withdraw_amount,
        crate::error::ErrorCode::InsufficientFunds
    );
    require!(withdraw_amount > 0, crate::error::ErrorCode::InvalidAmount);

    // ── 5. Dequeue, decrement total_shares ────────────────────────────────────
    {
        let mut vault = ctx.accounts.vault.load_mut()?;
        vault.withdrawal_queue.pop()?;
        vault.total_shares = vault
            .total_shares
            .checked_sub(shares)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;
    }

    // ── 6. Transfer lent tokens to requester (state PDA is vault authority) ───
    let state_bump = ctx.bumps.state;
    let seeds = &[b"state" as &[u8], &[state_bump]];
    let signer = &[&seeds[..]];

    anchor_spl::token::transfer(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            anchor_spl::token::Transfer {
                from: ctx.accounts.vault_token_account_a.to_account_info(),
                to: ctx.accounts.requester_lent_token_account.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            signer,
        ),
        withdraw_amount,
    )?;

    let total_shares = ctx.accounts.vault.load()?.total_shares;
    msg!(
        "ProcessVaultQueue: fulfilled {} shares → {} lent tokens for {}. Total shares remaining: {}",
        shares,
        withdraw_amount,
        entry.requester,
        total_shares,
    );

    Ok(())
}
