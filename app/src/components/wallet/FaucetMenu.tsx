import { useLendingAccounts } from "@/hooks/program/useLendingAccounts";
import { useFaucet } from "@/hooks/useFaucet";
import { cn } from "@/lib/utils";
import type { PublicKey } from "@solana/web3.js";
import { Droplets, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getMint } from "@solana/spl-token";
import { connection } from "@/lib/program";

// Same minter pubkey as useFaucet.ts
const MINTER_PUBKEY = "GqWFPtJTX4jVAQxX17vMbzwtY97PsZk7gaEtVuMjtk6D";

function truncateMint(pk: PublicKey) {
  const s = pk.toBase58();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function useMintAuthority(mint: PublicKey | null): boolean | null {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!mint) return;
    getMint(connection, mint)
      .then(info => {
        const matches = info.mintAuthority?.toBase58() === MINTER_PUBKEY;
        setIsValid(matches);
      })
      .catch(() => setIsValid(false));
  }, [mint?.toBase58()]);
  
  return isValid;
}

function FaucetRow({ mint }: { mint: PublicKey }) {
  const { mutate, isPending, error } = useFaucet(mint);
  const isValidMinter = useMintAuthority(mint);

  const handleClick = (e: React.MouseEvent) => {
    if (isValidMinter === false) return;
    e.preventDefault()
    e.stopPropagation()
    mutate()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || isValidMinter === false}
      className={
        cn(
          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2",
          "text-xs font-medium transition-colors",
          isValidMinter === false 
            ? "text-[#efe0f7]/20 cursor-not-allowed" 
            : "text-[#c698e5]/80 hover:bg-[#c698e5]/10 cursor-pointer",
          isPending && "opacity-50"
        )
      }
    >
      <span className="font-mono text-[10px] text-[#efe0f7]/40">
        {truncateMint(mint)}
      </span>
      <div className="flex items-center gap-2">
        {isValidMinter === false && (
          <span className="text-[10px] text-[#efe0f7]/20">No faucet</span>
        )}
        {isValidMinter === null && (
          <Loader2 size={10} className="shrink-0 animate-spin text-[#efe0f7]/20" />
        )}
        {error && isValidMinter !== false && (
          <span className="text-[10px] text-red-400">Failed</span>
        )}
        {isPending ? (
          <Loader2 size={11} className="shrink-0 animate-spin text-[#c698e5]" />
        ) : isValidMinter !== false && (
          <Droplets size={11} className="shrink-0 text-[#c698e5]/60" />
        )}
      </div>
    </button >
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

  // Collect all unique mints (both collateral and lend) across all pools
  const uniqueMints = Array.from(
    new Map(
      pools.flatMap((p) => [
        [p.collateralMint.toBase58(), p.collateralMint],
        [p.lendMint.toBase58(), p.lendMint],
      ]),
    ).values(),
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
