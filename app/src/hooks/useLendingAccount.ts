import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { program } from '../lib/program'
import type { LendingAccountData } from '../types/lending'

export type { LendingAccountData }

const LENDING_SEED = 'lending'

/** Fetch a single lending account by authority + mint (PDA derivation). */
export function useLendingAccount(
    authority: PublicKey | null,
    mint: PublicKey | null,
): { account: LendingAccountData | null; loading: boolean; error: string | null } {
    const [account, setAccount] = useState<LendingAccountData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!authority || !mint) return
        let cancelled = false

        async function fetchAccount() {
            setLoading(true)
            setError(null)
            try {
                const [pda] = PublicKey.findProgramAddressSync(
                    [new TextEncoder().encode(LENDING_SEED), authority!.toBytes(), mint!.toBytes()],
                    program.programId,
                )
                const data = await program.account.pool.fetch(pda)
                if (!cancelled) {
                    setAccount({
                        publicKey: pda,
                        authority: data.authority,
                        mint: data.mint,
                        lpMint: data.lpMint,
                        totalDeposited: BigInt(data.totalDeposited.toString()),
                        totalBorrowed: BigInt(data.totalBorrowed.toString()),
                        totalLpIssued: BigInt(data.totalLpIssued.toString()),
                        lastAccrualTs: BigInt(data.lastAccrualTs.toString()),
                        bump: data.bump,
                        lpMintBump: data.lpMintBump,
                        borrowFeeBps: data.borrowFeeBps,
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
    }, [authority?.toBase58(), mint?.toBase58()])

    return { account, loading, error }
}
