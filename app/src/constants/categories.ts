import type { Category } from "@/types/pool";

export const CATEGORY_FILTERS: { value: "all" | Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stablecoin", label: "Stablecoins" },
  { value: "volatile", label: "Volatile" },
  { value: "lsd", label: "LSD" },
];

export const CATEGORY_COLORS: Record<string, string> = {
  stablecoin: "text-[#34d399] bg-[#34d399]/8 border-[#34d399]/20",
  volatile: "text-[#c698e5] bg-[#c698e5]/8 border-[#c698e5]/20",
  lsd: "text-[#f0a854] bg-[#f0a854]/8 border-[#f0a854]/20",
};

export const CATEGORY_BADGE: Record<
  Category,
  { label: string; classes: string }
> = {
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
