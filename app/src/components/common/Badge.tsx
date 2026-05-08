/** Shared badge components used across the portfolio feature */

export function HealthBadge({ value }: { value: number }) {
  const color =
    value >= 85
      ? "text-[#34d399] bg-[#34d399]/10"
      : value >= 70
        ? "text-[#f0a854] bg-[#f0a854]/10"
        : "text-[#d45677] bg-[#d45677]/10";
  return (
    <span
      className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${color}`}
    >
      {value}%
    </span>
  );
}

export function HFBadge({ value }: { value: number }) {
  const color =
    value >= 2.5
      ? "text-[#34d399] bg-[#34d399]/10"
      : value >= 1.5
        ? "text-[#f0a854] bg-[#f0a854]/10"
        : "text-[#d45677] bg-[#d45677]/10";
  return (
    <span
      className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${color}`}
    >
      {value.toFixed(2)}
    </span>
  );
}
