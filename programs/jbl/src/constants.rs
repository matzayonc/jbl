use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

/// Seconds per year (365.25 days)
pub const SECONDS_PER_YEAR: u64 = 31_557_600;

/// Flash loan fee in basis points (9 bps = 0.09%).
pub const FLASH_LOAN_FEE_BPS: u64 = 9;
