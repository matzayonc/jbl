import { cn } from "@/lib/utils";
import { useWalletConnection } from "@solana/react-hooks";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
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
          onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2",
            "text-xs font-medium text-gray-700 shadow-sm transition-all",
            "hover:border-gray-300 hover:bg-gray-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="font-mono tracking-tight">
            {truncateAddress(address)}
          </span>
          <ChevronDown
            size={12}
            className={cn(
              "text-gray-400 transition-transform duration-150",
              menuOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 mt-1.5 w-40 rounded-xl border border-gray-100 bg-white p-1 shadow-lg z-40">
            <button
              type="button"
              onClick={handleDisconnect}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2",
                "text-xs font-medium text-red-500 transition-colors",
                "hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
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
          "flex items-center gap-2 rounded-xl px-4 py-2",
          "bg-gradient-to-r from-violet-500 to-indigo-600 text-xs font-semibold text-white shadow-sm",
          "transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-60",
        )}
      >
        {connecting ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Wallet size={13} />
        )}
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>

      <WalletModal open={modalOpen} onClose={closeModal} />
    </>
  );
}
