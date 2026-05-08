import type { MultiplyMeta } from "@/types/pool";

const USDC_ICON =
  "https://wsrv.nl/?w=64&h=64&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&dpr=2&quality=80";
const SOL_ICON =
  "https://wsrv.nl/?w=64&h=64&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FSo11111111111111111111111111111111111111112%2Flogo.png&dpr=2&quality=80";

export const MULTIPLY_META: Record<string, MultiplyMeta> = {
  sol: {
    maxMultiplier: 3.0,
    maxNetAPY: 4.2,
    debtSymbol: "USDC",
    debtIcon: USDC_ICON,
  },
  wbtc: {
    maxMultiplier: 3.0,
    maxNetAPY: 3.1,
    debtSymbol: "USDC",
    debtIcon: USDC_ICON,
  },
  weth: {
    maxMultiplier: 3.0,
    maxNetAPY: 3.8,
    debtSymbol: "USDC",
    debtIcon: USDC_ICON,
  },
  jitosol: {
    maxMultiplier: 5.0,
    maxNetAPY: 16.7,
    debtSymbol: "SOL",
    debtIcon: SOL_ICON,
  },
};
