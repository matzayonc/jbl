import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { program } from '../lib/program'
import type { LendingAccountData } from '../types/lending'

export type { LendingAccountData }

/** Fetch a single lending pool account by its public key. */
export function useLendingAccount(
    poolAddress: PublicKey | null,
): { account: LendingAccountData | null; loading: boolean; error: string | null } {
    const [account, setAccount] = useState<LendingAccountData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!poolAddress) return
        let cancelled = false

        async function fetchAccount() {
            setLoading(true)
            setError(null)
            try {
                const data = await program.account.pool.fetch(poolAddress!)
                if (!cancelled) {
                    setAccount({
                        publicKey: poolAddress!,
                        authority: data.authority,
                        mint: data.mint,
                        lpMint: data.lpMint,
                        totalDeposited: BigInt(data.totalDeposited.toString()),
                        totalBorrowed: BigInt(data.totalBorrowed.toString()),
                        totalLpIssued: BigInt(data.totalLpIssued.toString()),
                        lastAccrualTs: BigInt(data.lastAccrualTs.toString()),
                        poolSignerBump: data.poolSignerBump,
                        lpMintBump: data.lpMintBump,
                        feeConfig: {
                            m1: BigInt(data.feeConfig.m1.toString()),
                            c1: BigInt(data.feeConfig.c1.toString()),
                            m2: BigInt(data.feeConfig.m2.toString()),
                            c2: BigInt(data.feeConfig.c2.toString()),
                        },
                    })
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err))
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchAccount()
        return () => { cancelled = true }
    }, [poolAddress?.toBase58()])

    return { account, loading, error }
}
