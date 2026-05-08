import { useFaucet } from "@/hooks/useFaucet";
import { useLendingAccounts } from "@/hooks/useLendingAccounts";
import { cn } from "@/lib/utils";
import type { PublicKey } from "@solana/web3.js";
import { Droplets, Loader2 } from "lucide-react";

function truncateMint(pk: PublicKey) {
  const s = pk.toBase58();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function FaucetRow({ mint }: { mint: PublicKey }) {
  const { mutate, isPending } = useFaucet(mint);

  return (
    <button
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2",
        "text-xs font-medium text-[#c698e5]/80 transition-colors",
        "hover:bg-[#c698e5]/10 disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span className="font-mono text-[10px] text-[#efe0f7]/40">
        {truncateMint(mint)}
      </span>
      {isPending ? (
        <Loader2 size={11} className="shrink-0 animate-spin text-[#c698e5]" />
      ) : (
        <Droplets size={11} className="shrink-0 text-[#c698e5]/60" />
      )}
    </button>
  );
}

/**
 * Renders a faucet section inside the wallet dropdown.
 * Fetches all lending pools and shows one faucet row per unique mint.
 */
export function FaucetMenu() {
  const { data: pools, isLoading } = useLendingAccounts();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-[#efe0f7]/30">
        <Loader2 size={10} className="animate-spin" />
        Loading pools…
      </div>
    );
  }

  if (!pools || pools.length === 0) return null;

  // Deduplicate by mint address
  const uniqueMints = Array.from(
    new Map(pools.map((p) => [p.mint.toBase58(), p.mint])).values(),
  );

  return (
    <>
      <div className="mx-3 my-1 border-t border-[#c698e5]/10" />
      <div className="px-3 py-1.5">
        <p className="text-[10px] uppercase tracking-widest text-[#efe0f7]/30">
          Faucet
        </p>
      </div>
      {uniqueMints.map((mint) => (
        <FaucetRow key={mint.toBase58()} mint={mint} />
      ))}
    </>
  );
}
