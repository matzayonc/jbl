interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}

export function StatCard({ label, value, sub, positive }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[#c698e5]/12 bg-[#c698e5]/[0.025] px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#efe0f7]/35 mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-[#efe0f7] tabular-nums">{value}</p>
      {sub !== undefined && (
        <p
          className={`text-[11px] mt-0.5 tabular-nums ${
            positive === true
              ? "text-[#34d399]"
              : positive === false
                ? "text-[#d45677]"
                : "text-[#efe0f7]/35"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
