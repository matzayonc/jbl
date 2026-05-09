import { ChartRangePicker } from "@/components/common/ChartRangePicker";
import {
  dateLabel,
  formatLargeUSD,
  seededRand,
  thinData,
} from "@/lib/formatters";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RANGE_OPTIONS = ["30D", "5M", "1Y"] as const;
type Range = (typeof RANGE_OPTIONS)[number];
const RANGE_DAYS: Record<Range, number> = { "30D": 30, "5M": 150, "1Y": 365 };

function generateData(currentBorrow: number, days: number, seed: number) {
  const data: { date: string; borrow: number }[] = [];
  const now = new Date();
  const startFraction = 0.28 + (Math.sin(seed * 2.1) * 0.5 + 0.5) * 0.28;
  const startBorrow = currentBorrow * startFraction;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const t = (days - i) / days;
    const logistic = 1 / (1 + Math.exp(-9 * (t - 0.42)));
    const trend = startBorrow + (currentBorrow - startBorrow) * logistic;
    const noise = seededRand(seed, i, 7.3) * 0.035;
    const value = Math.max(trend * (1 + noise), startBorrow * 0.85);
    data.push({ date: dateLabel(date, days), borrow: Math.round(value) });
  }
  return data;
}

interface TotalBorrowChartProps {
  totalBorrowed: number;
  seed: number;
}

export function TotalBorrowChart({
  totalBorrowed,
  seed,
}: TotalBorrowChartProps) {
  const [range, setRange] = useState<Range>("30D");

  const thinned = useMemo(
    () => thinData(generateData(totalBorrowed, RANGE_DAYS[range], seed)),
    [totalBorrowed, seed, range],
  );

  const minVal = Math.min(...thinned.map((d) => d.borrow)) * 0.96;
  const maxVal = Math.max(...thinned.map((d) => d.borrow)) * 1.03;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-[#c698e5]/20 bg-[#1a0d24] px-3 py-2 text-xs">
        <p className="text-[#efe0f7]/40 mb-0.5">{label}</p>
        <p className="font-semibold text-[#d45677]">
          {formatLargeUSD(payload[0].value)}
        </p>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-[#c698e5]/15 bg-[#c698e5]/[0.03] px-5 pt-5 pb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-[#efe0f7]">Total Borrowed</p>
          <p className="text-[11px] text-[#efe0f7]/35 mt-0.5">
            Borrows over time
          </p>
        </div>
        <ChartRangePicker
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          activeClass="bg-[#d45677]/20 text-[#d45677]"
        />
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={thinned}
          margin={{ top: 4, right: 4, left: -4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="totalBorrowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d45677" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#d45677" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(198,152,229,0.07)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "rgba(239,224,247,0.3)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fill: "rgba(239,224,247,0.3)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatLargeUSD}
            width={52}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "rgba(212,86,119,0.2)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="borrow"
            stroke="#d45677"
            strokeWidth={1.5}
            fill="url(#totalBorrowGrad)"
            dot={false}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
