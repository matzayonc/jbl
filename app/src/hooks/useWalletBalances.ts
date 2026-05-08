import { useWalletConnection } from '@solana/react-hooks'
import type { PublicKey } from '@solana/web3.js'
import { useWalletBalancesStore } from '../store/wallet.store'

/**
 * Returns the globally-cached wallet balances (SOL + SPL + SPL-2022).
 *
 * Balances are fetched and kept fresh by `WalletBalancesSync` (mounted in
 * Providers). This hook is read-only — it does not trigger any network request.
 */
export function useWalletBalances() {
    const { balances, isLoading, error, fetch, address } = useWalletBalancesStore()
    const { connected, wallet } = useWalletConnection()

    const currentAddress = connected && wallet ? String(wallet.account.address) : null

    return {
        data: balances,
        isLoading,
        error,
        /** Manually trigger a refresh of the wallet balances. */
        refetch: () => {
            if (currentAddress) void fetch(currentAddress)
        },
        address,
    }
}

/**
 * Returns a single token balance by mint address, or undefined if not found.
 * Reads from the same global Zustand store — no extra network request.
 */
export function useTokenBalance(mint: PublicKey | null) {
    const { balances } = useWalletBalancesStore()
    if (!mint || !balances) return undefined
    return balances.tokens.find((t) => t.mint.equals(mint))
}
