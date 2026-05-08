import { ActionButton } from "@/components/common/ActionButton";
import { formatUSD, type Category, type Pool } from "@/data/pools";
import { cn } from "@/lib/utils";
import { ExternalLink, TrendingDown, TrendingUp } from "lucide-react";

const CATEGORY_BADGE: Record<Category, { label: string; classes: string }> = {
  stablecoin: {
    label: "Stablecoin",
    classes: "text-[#34d399] bg-[#34d399]/10 border-[#34d399]/25",
  },
  volatile: {
    label: "Volatile",
    classes: "text-[#c698e5] bg-[#c698e5]/10 border-[#c698e5]/25",
  },
  lsd: {
    label: "LSD",
    classes: "text-[#f0a854] bg-[#f0a854]/10 border-[#f0a854]/25",
  },
};

interface PoolHeroProps {
  pool: Pool;
  isWalletConnected: boolean;
  onDeposit: () => void;
  onBorrow: () => void;
}

export function PoolHero({
  pool,
  isWalletConnected,
  onDeposit,
  onBorrow,
}: PoolHeroProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
      <div className="flex items-start gap-5">
        <img
          src={pool.icon}
          alt={pool.symbol}
          width={64}
          height={64}
          className="relative h-16 w-16 rounded-full object-contain"
        />
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-[#efe0f7]">
              {pool.name}
            </h1>
            <span className="text-sm font-medium text-[#efe0f7]/40">
              {pool.symbol}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-[#c698e5] px-2 py-0.5 rounded-md bg-[#c698e5]/10 border border-[#c698e5]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c698e5] opacity-80" />
              Verified
            </span>
            <span
              className={cn(
                "inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md border",
                CATEGORY_BADGE[pool.category].classes,
              )}
            >
              {CATEGORY_BADGE[pool.category].label}
            </span>
            <a
              href={`https://solscan.io/token/${pool.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#efe0f7]/25 hover:text-[#c698e5] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Solscan
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ActionButton
          label="Deposit"
          variant="primary"
          disabled={!isWalletConnected}
          onClick={onDeposit}
          icon={<TrendingUp className="h-4 w-4 text-[#17081f]" />}
        />
        <ActionButton
          label="Borrow"
          variant="secondary"
          disabled={!isWalletConnected}
          onClick={onBorrow}
          icon={<TrendingDown className="h-4 w-4 text-[#c698e5]" />}
        />
      </div>
    </div>
  );
}

interface PoolStatsBarProps {
  pool: Pool;
}

function StatItem({
  label,
  value,
  isApy,
}: {
  label: string;
  value: string;
  isApy?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-5 min-w-[120px]">
      <p
        className={`text-xl font-semibold tabular-nums ${
          isApy ? "text-[#34d399]" : "text-[#efe0f7]"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-[#efe0f7]/40 text-center leading-tight">
        {label}
      </p>
    </div>
  );
}

export function PoolStatsBar({ pool }: PoolStatsBarProps) {
  return (
    <div className="overflow-hidden mb-8 rounded-2xl border border-[#c698e5]/12 bg-[#c698e5]/[0.03]">
      <div className="flex w-full overflow-x-auto divide-x divide-[#c698e5]/10">
        <StatItem
          label="Total Supplied"
          value={formatUSD(pool.totalSupplied)}
        />
        <StatItem
          label="Total Borrowed"
          value={formatUSD(pool.totalBorrowed)}
        />
        <StatItem
          label="Available Liquidity"
          value={formatUSD(pool.availableLiquidity)}
        />
        <StatItem
          label="Utilization"
          value={`${pool.utilization.toFixed(2)}%`}
        />
        <StatItem
          label="Supply APY"
          value={`${pool.supplyAPY.toFixed(2)}%`}
          isApy
        />
        <StatItem
          label="Borrow APY"
          value={`${pool.borrowAPY.toFixed(2)}%`}
          last
        />
      </div>
    </div>
  );
}
