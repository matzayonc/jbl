use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Debug)]
pub struct UtilizationFeeConfig {
    pub m1: u64,
    pub c1: u64,
    pub m2: u64,
    pub c2: u64,
}

impl UtilizationFeeConfig {
    pub fn get_fee_bps(&self, utilization_bps: u64) -> u32 {
        // y = (m * x) / 10,000 + c
        // utilization_bps is 0..10,000
        let y1 = ((self.m1 as u128)
            .saturating_mul(utilization_bps as u128)
            .checked_div(10_000)
            .unwrap_or(0))
        .saturating_add(self.c1 as u128);

        let y2 = ((self.m2 as u128)
            .saturating_mul(utilization_bps as u128)
            .checked_div(10_000)
            .unwrap_or(0))
        .saturating_add(self.c2 as u128);

        y1.max(y2) as u32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flat_fee() {
        let config = UtilizationFeeConfig {
            m1: 0,
            c1: 500, // 5% flat
            m2: 0,
            c2: 0,
        };
        assert_eq!(config.get_fee_bps(0), 500);
        assert_eq!(config.get_fee_bps(5000), 500);
        assert_eq!(config.get_fee_bps(10000), 500);
    }

    #[test]
    fn test_sloped_fee() {
        let config = UtilizationFeeConfig {
            m1: 1000, // +10% slope
            c1: 200,  // 2% base
            m2: 0,
            c2: 0,
        };
        // 0% util -> 2% (200 bps)
        assert_eq!(config.get_fee_bps(0), 200);
        // 50% util -> 2% + 0.5 * 10% = 7% (700 bps)
        assert_eq!(config.get_fee_bps(5000), 700);
        // 100% util -> 2% + 10% = 12% (1200 bps)
        assert_eq!(config.get_fee_bps(10000), 1200);
    }

    #[test]
    fn test_kink_fee() {
        // Typical model: flat until 80%, then steep slope
        // Line 1: y = 200 (2% flat)
        // Line 2: y = 10000 * (util - 80%) / 20% + 200  => steep slope after 80%
        // To make Line 2 cross 200 at 80% (8000 bps):
        // m2 * 8000 / 10000 + c2 = 200
        // Let's say we want 30% fee at 100% util (10000 bps)
        // m2 * 10000 / 10000 + c2 = 3000
        // m2 + c2 = 3000
        // 0.8 * m2 + c2 = 200
        // 0.2 * m2 = 2800 => m2 = 14000
        // c2 = 3000 - 14000 = -11000 (but we use saturating_add and unsigned, so we need a different approach if c < 0)
        
        // Alternatively, just pick two lines that intersect at 80%
        // Line 1: m1=0, c1=200 (2% flat)
        // Line 2: m2=20000, c2=0. At 80% it is 20000 * 0.8 = 16000 (way above 200)
        
        // Let's use the provided logic: max(y1, y2)
        let config = UtilizationFeeConfig {
            m1: 0,
            c1: 200,    // 2% floor
            m2: 20000,  // Steep slope
            c2: 0,
        };
        // At 1% util: y1=200, y2=200. Max=200
        assert_eq!(config.get_fee_bps(100), 200);
        // At 10% util: y1=200, y2=20000 * 0.1 = 2000. Max=2000
        assert_eq!(config.get_fee_bps(1000), 2000);
        
        // Example from instructions: m1=0, c1=200, m2=1000, c2=0
        let config2 = UtilizationFeeConfig {
            m1: 0,
            c1: 200,
            m2: 1000,
            c2: 0,
        };
        // util=10%: y1=200, y2=100. Max=200
        assert_eq!(config2.get_fee_bps(1000), 200);
        // util=30%: y1=200, y2=300. Max=300
        assert_eq!(config2.get_fee_bps(3000), 300);
    }
}
