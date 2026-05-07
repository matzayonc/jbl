use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub const VAULT_SPACE: usize = 8 + std::mem::size_of::<Vault>();

#[derive(Accounts)]
pub struct CreateVault<'info> {
    /// The vault data account.  Must be pre-allocated (size = VAULT_SPACE) and
    /// owned by this program before calling `create_vault`.  Pre-allocating in
    /// a separate transaction bypasses the 10 KB CPI account-creation limit.
    #[account(zero)]
    pub vault: AccountLoader<'info, Vault>,

    /// CHECK: Signer-only PDA — no data stored; used as authority for vault token accounts.
    #[account(
        seeds = [b"state"],
        bump,
    )]
    pub state: UncheckedAccount<'info>,

    /// Token account holding deposited `lent_mint` tokens.
    #[account(
        init,
        payer = payer,
        token::mint = lent_mint,
        token::authority = state,
        seeds = [b"vault_tokens_a", vault.key().as_ref()],
        bump
    )]
    pub vault_token_account_a: Account<'info, TokenAccount>,

    /// Token account holding deposited `lp_mint` tokens.
    #[account(
        init,
        payer = payer,
        token::mint = lp_mint,
        token::authority = state,
        seeds = [b"vault_tokens_b", vault.key().as_ref()],
        bump
    )]
    pub vault_token_account_b: Account<'info, TokenAccount>,

    /// The lent token mint.
    pub lent_mint: Account<'info, Mint>,

    /// The LP token mint.
    pub lp_mint: Account<'info, Mint>,

    /// The authority that controls this vault (can deposit / withdraw).
    pub authority: Signer<'info>,

    /// Pays for account rent.
    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn create_vault_handler(ctx: Context<CreateVault>) -> Result<()> {
    let mut vault = ctx.accounts.vault.load_init()?;

    vault.authority = ctx.accounts.authority.key();
    vault.lent_mint = ctx.accounts.lent_mint.key();
    vault.lp_mint = ctx.accounts.lp_mint.key();
    vault.total_shares = 0;
    // withdrawal_queue is zero-initialised by load_init (head=0, tail=0)

    msg!(
        "Created vault for authority: {} with lent_mint: {} and lp_mint: {}",
        ctx.accounts.authority.key(),
        ctx.accounts.lent_mint.key(),
        ctx.accounts.lp_mint.key(),
    );

    Ok(())
}
