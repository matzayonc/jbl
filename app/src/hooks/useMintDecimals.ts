import { getMint } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { connection } from '../lib/program'

/**
 * Fetches the decimal places of a SPL/SPL-2022 mint.
 * Result is cached indefinitely — mint decimals are immutable.
 */
export function useMintDecimals(mint: PublicKey | null) {
    return useQuery({
        queryKey: ['mint', 'decimals', mint?.toBase58() ?? 'null'],
        queryFn: async () => {
            const info = await getMint(connection, mint!)
            return info.decimals
        },
        enabled: !!mint,
        staleTime: Infinity,
        gcTime: Infinity,
    })
}
