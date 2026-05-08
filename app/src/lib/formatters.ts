export function formatUSD(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatLargeUSD(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${(v / 1_000).toFixed(0)}K`;
}

export function seededRand(seed: number, i: number, salt: number): number {
  const base =
    Math.sin(seed * 2.3 + i * 0.31 + salt) * 0.55 +
    Math.sin(seed * 0.7 + i * 0.11 + salt * 1.3) * 0.28 +
    Math.sin(seed * 5.1 + i * 0.057 + salt * 0.6) * 0.17;
  const spike =
    Math.abs(Math.sin(seed * 1.1 + i * 0.19 + salt * 2.7)) > 0.93
      ? Math.sin(seed + i) * 1.8
      : 0;
  return base + spike;
}

export function thinData<T>(data: T[], maxPoints = 60): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

export function dateLabel(date: Date, days: number): string {
  return days <= 30
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
