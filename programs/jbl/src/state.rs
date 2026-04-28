use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LendingAccount {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub lp_mint: Pubkey, // The LP token mint for this lending pool
    pub total_deposited: u64,
    pub total_borrowed: u64,
    pub total_lp_issued: u64, // Total LP tokens issued
    pub last_update_slot: u64,
    pub bump: u8,
    pub lp_mint_bump: u8,
}
