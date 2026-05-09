export function PnlCell({ pnl, pct }: { pnl: number; pct: number }) {
  const pos = pnl >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 tabular-nums ${
        pos ? "text-[#34d399]" : "text-[#d45677]"
      }`}
    >
      {pos ? "+" : ""}${pnl.toFixed(0)}{" "}
      <span className="font-normal text-xs opacity-70">
        ({pos ? "+" : ""}
        {pct.toFixed(2)}%)
      </span>
    </span>
  );
}
