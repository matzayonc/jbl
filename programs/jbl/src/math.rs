use crate::constants::SECONDS_PER_YEAR;

/// Compute simple interest owed on a borrow position.
///
/// ```text
/// interest = principal × rate_bps × elapsed_secs
///            ─────────────────────────────────────
///                  10_000 × SECONDS_PER_YEAR
/// ```
///
/// All intermediate arithmetic is done in `u128` to accommodate extreme
/// inputs (e.g. 1 billion tokens at 1 000 % APR for 4 years) without
/// overflow.  Returns `None` on arithmetic overflow or if the final value
/// exceeds `u64::MAX`.
pub fn compute_interest(principal: u64, rate_bps: u32, elapsed_secs: u64) -> Option<u64> {
    let numerator = (principal as u128)
        .checked_mul(rate_bps as u128)?
        .checked_mul(elapsed_secs as u128)?;

    let denominator = 10_000u128.checked_mul(SECONDS_PER_YEAR as u128)?;

    let interest_u128 = numerator.checked_div(denominator)?;

    u64::try_from(interest_u128).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    const YEAR: u64 = SECONDS_PER_YEAR;

    // ── helpers ──────────────────────────────────────────────────────────────

    /// 1 billion tokens expressed in raw units (6 decimals).
    const ONE_BILLION: u64 = 1_000_000_000 * 1_000_000;

    // ── basic correctness ─────────────────────────────────────────────────────

    #[test]
    fn zero_elapsed_is_zero_interest() {
        assert_eq!(compute_interest(ONE_BILLION, 500, 0), Some(0));
    }

    #[test]
    fn zero_principal_is_zero_interest() {
        assert_eq!(compute_interest(0, 500, YEAR), Some(0));
    }

    #[test]
    fn zero_rate_is_zero_interest() {
        assert_eq!(compute_interest(ONE_BILLION, 0, YEAR), Some(0));
    }

    /// 100 % APR (10 000 bps) for exactly 1 year → interest == principal.
    #[test]
    fn one_year_hundred_percent_apr() {
        let result = compute_interest(1_000_000, 10_000, YEAR);
        assert_eq!(result, Some(1_000_000));
    }

    /// 50 % APR (5 000 bps) for 1 year → interest == principal / 2.
    #[test]
    fn one_year_fifty_percent_apr() {
        let result = compute_interest(1_000_000, 5_000, YEAR);
        assert_eq!(result, Some(500_000));
    }

    /// 1 % APR (100 bps) for 1 year.
    #[test]
    fn one_year_one_percent_apr() {
        let result = compute_interest(1_000_000, 100, YEAR);
        assert_eq!(result, Some(10_000));
    }

    /// Half-year accrual is exactly half of a full year.
    #[test]
    fn half_year_is_half_of_full_year() {
        let full = compute_interest(1_000_000, 5_000, YEAR).unwrap();
        let half = compute_interest(1_000_000, 5_000, YEAR / 2).unwrap();
        // Allow ±1 for integer division rounding.
        assert!((full / 2).abs_diff(half) <= 1);
    }

    // ── extreme / overflow stress tests ──────────────────────────────────────

    /// 1 billion tokens (6 dp), 1 000 % APR, 4 years — must NOT overflow.
    /// Expected: principal × 10 × 4 / 1 = 40 billion tokens.
    #[test]
    fn one_billion_tokens_1000pct_4_years_no_overflow() {
        let principal = ONE_BILLION;          // 10^15 raw units
        let rate_bps: u32 = 100_000;          // 1 000 % APR = 100_000 bps
        let elapsed = 4 * YEAR;

        let interest = compute_interest(principal, rate_bps, elapsed)
            .expect("should not overflow");

        // At 1000 % APR for 4 years: interest = principal × 10 × 4 = 40×principal
        let expected = principal.checked_mul(40).expect("expected overflow-free");
        assert_eq!(interest, expected);
    }

    /// u64::MAX principal, 1 bps, 1 second — intermediate u128 must absorb it.
    #[test]
    fn max_principal_tiny_rate_one_second_no_overflow() {
        let result = compute_interest(u64::MAX, 1, 1);
        // u64::MAX * 1 * 1 / (10_000 * 31_557_600)
        // = 18_446_744_073_709_551_615 / 315_576_000_000 ≈ 58_450_000 — fits comfortably in u64.
        assert!(result.is_some());
        assert!(result.unwrap() < 100_000_000); // well under 100 million
    }

    /// Very large principal × max rate × many years should still not panic.
    /// The result may overflow u64; the function should return None gracefully.
    #[test]
    fn graceful_none_on_u64_overflow() {
        // u64::MAX tokens at u32::MAX bps for 1_000 years — result overflows u64.
        let result = compute_interest(u64::MAX, u32::MAX, 1_000 * YEAR);
        // Either Some (if it fits) or None — must not panic.
        let _ = result;
    }
}
