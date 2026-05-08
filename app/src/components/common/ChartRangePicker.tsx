import { cn } from "@/lib/utils";

interface ChartRangePickerProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  activeClass?: string;
}

export function ChartRangePicker<T extends string>({
  options,
  value,
  onChange,
  activeClass = "bg-[#c698e5]/20 text-[#c698e5]",
}: ChartRangePickerProps<T>) {
  return (
    <div className="flex items-center gap-1">
      {options.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer",
            value === r
              ? activeClass
              : "text-[#efe0f7]/35 hover:text-[#efe0f7]/70",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
