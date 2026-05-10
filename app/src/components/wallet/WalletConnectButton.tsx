import { cn } from "@/lib/utils";
import { useWalletConnection } from "@solana/react-hooks";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { FaucetMenu } from "./FaucetMenu";
import { WalletModal } from "./WalletModal";

function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const { connected, connecting, disconnect, wallet } = useWalletConnection();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleDisconnect = useCallback(async () => {
    setMenuOpen(false);
    await disconnect();
  }, [disconnect]);

  // ── Connected state ──────────────────────────────────────────────────────────
  if (connected && wallet) {
    const address = String(wallet.account.address);

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          // onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
          className={cn(
            "flex items-center cursor-pointer gap-2 rounded-xl border border-[#c698e5]/25 bg-[#c698e5]/10 px-3 py-2",
            "text-xs font-medium text-[#efe0f7] transition-all",
            "hover:border-[#c698e5]/50 hover:bg-[#c698e5]/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c698e5]/50 focus-visible:ring-offset-0",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#c698e5] shrink-0 shadow-[0_0_6px_#c698e5]" />
          <span className="font-mono tracking-tight text-[#efe0f7]/80">
            {truncateAddress(address)}
          </span>
          <ChevronDown
            size={12}
            className={cn(
              "text-[#c698e5]/60 transition-transform duration-150",
              menuOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#c698e5]/15 bg-[#1f0e2b] p-1 shadow-2xl z-40">
            <div className="px-3 py-2 mb-1 border-b border-[#c698e5]/10">
              <p className="text-[10px] uppercase tracking-widest text-[#efe0f7]/30">
                Connected
              </p>
              <p className="text-xs font-mono text-[#c698e5] mt-0.5">
                {truncateAddress(address)}
              </p>
            </div>
            <FaucetMenu />
            <div className="mx-3 my-1 border-t border-[#c698e5]/10" />
            <button
              type="button"
              onClick={handleDisconnect}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2",
                "text-xs font-medium text-[#d45677] transition-colors",
                "hover:bg-[#d45677]/10 focus-visible:outline-none",
              )}
            >
              <LogOut size={13} />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Disconnected state ───────────────────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={connecting}
        className={cn(
          "flex items-center cursor-pointer gap-2 rounded-xl px-4 py-2",
          "bg-[#c698e5] text-xs font-semibold text-[#17081f]",
          "transition-all hover:bg-[#d8b4f0] active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c698e5]/50 focus-visible:ring-offset-0",
          "disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        {connecting ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#17081f]/30 border-t-[#17081f]" />
        ) : (
          <Wallet size={13} />
        )}
        {connecting ? "Connecting…" : "Get Started"}
      </button>

      <WalletModal open={modalOpen} onClose={closeModal} />
    </>
  );
}
