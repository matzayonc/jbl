use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct LendingAccount {
    pub authority: Pubkey,
    pub total_deposited: u64,
    pub total_borrowed: u64,
    pub last_update_slot: u64,
    pub bump: u8,
}