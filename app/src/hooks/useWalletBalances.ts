import { useWalletConnection } from '@solana/react-hooks'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { connection } from '../lib/program'
import { queryKeys } from '../lib/queryKeys'
import type { TokenBalance, WalletBalances } from '../types/wallet'

async function fetchWalletBalances(address: string): Promise<WalletBalances> {
    const owner = new PublicKey(address)

    const [lamports, splAccounts, spl2022Accounts] = await Promise.all([
        connection.getBalance(owner, 'confirmed'),
        connection.getParsedTokenAccountsByOwner(
            owner,
            { programId: TOKEN_PROGRAM_ID },
            'confirmed',
        ),
        connection.getParsedTokenAccountsByOwner(
            owner,
            { programId: TOKEN_2022_PROGRAM_ID },
            'confirmed',
        ),
    ])

    function parseAccounts(
        accounts: Awaited<ReturnType<typeof connection.getParsedTokenAccountsByOwner>>,
        program: TokenBalance['program'],
    ): TokenBalance[] {
        return accounts.value
            .filter((a) => {
                const info = a.account.data.parsed?.info
                return info && BigInt(info.tokenAmount.amount) > 0n
            })
            .map((a) => {
                const info = a.account.data.parsed.info
                const tokenAmount = info.tokenAmount
                return {
                    mint: new PublicKey(info.mint as string),
                    ata: a.pubkey,
                    amount: BigInt(tokenAmount.amount as string),
                    decimals: tokenAmount.decimals as number,
                    uiAmount: (tokenAmount.uiAmount as number | null) ?? null,
                    program,
                }
            })
    }

    const tokens: TokenBalance[] = [
        ...parseAccounts(splAccounts, 'spl'),
        ...parseAccounts(spl2022Accounts, 'spl2022'),
    ]

    console.log(tokens)

    return { lamports: BigInt(lamports), tokens }
}

/**
 * Fetches and caches all wallet token balances (SPL + SPL-2022 + SOL).
 *
 * - Automatically enabled when a wallet is connected.
 * - Automatically cleared from cache when the wallet disconnects.
 * - Safe to call from multiple components — only one request is made.
 */
export function useWalletBalances() {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    const address = connected && wallet ? String(wallet.account.address) : null

    // Clear cached balances immediately when wallet disconnects
    useEffect(() => {
        if (!address) {
            queryClient.removeQueries({ queryKey: ['wallet', 'balances'] })
        }
    }, [address, queryClient])

    return useQuery({
        queryKey: queryKeys.wallet.balances(address ?? ''),
        queryFn: () => fetchWalletBalances(address!),
        enabled: !!address,
        staleTime: 15_000,
        gcTime: 60_000,
        refetchOnWindowFocus: true,
    })
}

/**
 * Returns a single token balance by mint address, or undefined if not found.
 * Uses the same cached data as useWalletBalances — no extra network request.
 */
export function useTokenBalance(mint: PublicKey | null) {
    const { data } = useWalletBalances()
    if (!mint || !data) return undefined
    return data.tokens.find((t) => t.mint.equals(mint))
}
