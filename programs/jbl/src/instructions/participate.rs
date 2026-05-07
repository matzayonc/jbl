use crate::state::Vault;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, MintTo, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct Participate<'info> {
    #[account(mut)]
    pub vault: AccountLoader<'info, Vault>,

    /// CHECK: Signer-only PDA — no data stored; signs LP-mint CPIs.
    #[account(
        seeds = [b"state"],
        bump,
    )]
    pub state: UncheckedAccount<'info>,

    /// The lent token mint accepted by the vault.
    pub lent_mint: Account<'info, Mint>,

    /// The vault's LP token mint. Created by `create_vault` as a PDA; `state` is
    /// the mint authority so this instruction can mint LP shares via CPI.
    #[account(
        mut,
        seeds = [b"lp_mint", vault.key().as_ref()],
        bump,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// The depositor.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The user's source token account for lent tokens.
    #[account(
        mut,
        constraint = user_lent_token_account.owner == authority.key()
            @ crate::error::ErrorCode::InvalidAmount,
        constraint = user_lent_token_account.mint == lent_mint.key()
            @ crate::error::ErrorCode::InvalidAmount,
    )]
    pub user_lent_token_account: Account<'info, TokenAccount>,

    /// Vault token account A — holds the deposited lent tokens.
    #[account(
        mut,
        seeds = [b"vault_tokens_a", vault.key().as_ref()],
        bump,
        constraint = vault_token_account_a.mint == lent_mint.key()
            @ crate::error::ErrorCode::InvalidAmount,
    )]
    pub vault_token_account_a: Account<'info, TokenAccount>,

    /// The user's LP token account — created if it doesn't already exist.
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

pub fn participate_handler(ctx: Context<Participate>, amount: u64) -> Result<()> {
    require!(amount > 0, crate::error::ErrorCode::InvalidAmount);

    // Validate lent_mint matches what is stored in the vault.
    {
        let vault = ctx.accounts.vault.load()?;
        require!(
            ctx.accounts.lent_mint.key() == vault.lent_mint,
            crate::error::ErrorCode::InvalidAmount
        );
    }

    // ── 1. Calculate LP shares to mint (proportional to existing vault balance) ──
    let shares_to_mint = {
        let vault = ctx.accounts.vault.load()?;
        let vault_balance = ctx.accounts.vault_token_account_a.amount;

        if vault.total_shares == 0 || vault_balance == 0 {
            // First deposit: 1 share per token.
            amount
        } else {
            (amount as u128)
                .checked_mul(vault.total_shares as u128)
                .ok_or(crate::error::ErrorCode::MathOverflow)?
                .checked_div(vault_balance as u128)
                .ok_or(crate::error::ErrorCode::MathOverflow)? as u64
        }
    };

    require!(shares_to_mint > 0, crate::error::ErrorCode::InvalidAmount);

    // ── 2. Transfer lent tokens from user to vault token account A ───────────
    anchor_spl::token::transfer(
        CpiContext::new(
            *ctx.accounts.token_program.to_account_info().key,
            anchor_spl::token::Transfer {
                from: ctx.accounts.user_lent_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account_a.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        amount,
    )?;

    // ── 3. Mint LP tokens to the user (state PDA is the mint authority) ───────
    let state_bump = ctx.bumps.state;
    let seeds = &[b"state" as &[u8], &[state_bump]];
    let signer = &[&seeds[..]];

    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            *ctx.accounts.token_program.to_account_info().key,
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.user_lp_token_account.to_account_info(),
                authority: ctx.accounts.state.to_account_info(),
            },
            signer,
        ),
        shares_to_mint,
    )?;

    // ── 4. Update vault total_shares ──────────────────────────────────────────
    {
        let mut vault = ctx.accounts.vault.load_mut()?;
        vault.total_shares = vault
            .total_shares
            .checked_add(shares_to_mint)
            .ok_or(crate::error::ErrorCode::MathOverflow)?;

        msg!(
            "Participate: deposited {} lent tokens, minted {} LP shares. Total shares: {}",
            amount,
            shares_to_mint,
            vault.total_shares,
        );
    }

    Ok(())
}
