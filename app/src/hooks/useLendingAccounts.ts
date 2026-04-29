import { useEffect, useState } from 'react'
import { program } from '../lib/program'
import type { LendingAccountData } from '../types/lending'

export type { LendingAccountData }

interface UseLendingAccountsResult {
    accounts: LendingAccountData[]
    loading: boolean
    error: string | null
    refetch: () => void
}

export function useLendingAccounts(): UseLendingAccountsResult {
    const [accounts, setAccounts] = useState<LendingAccountData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [fetchCount, setFetchCount] = useState(0)

    useEffect(() => {
        let cancelled = false

        async function fetchAccounts() {
            setLoading(true)
            setError(null)
            try {
                const all = await program.account.lendingAccount.all()
                if (!cancelled) {
                    setAccounts(
                        all.map(({ publicKey, account }) => ({
                            publicKey,
                            authority: account.authority,
                            mint: account.mint,
                            lpMint: account.lpMint,
                            totalDeposited: BigInt(account.totalDeposited.toString()),
                            totalBorrowed: BigInt(account.totalBorrowed.toString()),
                            totalLpIssued: BigInt(account.totalLpIssued.toString()),
                            lastUpdateSlot: BigInt(account.lastUpdateSlot.toString()),
                            bump: account.bump,
                            lpMintBump: account.lpMintBump,
                        })),
                    )
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err))
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchAccounts()
        return () => { cancelled = true }
    }, [fetchCount])

    return {
        accounts,
        loading,
        error,
        refetch: () => setFetchCount((n) => n + 1),
    }
}
