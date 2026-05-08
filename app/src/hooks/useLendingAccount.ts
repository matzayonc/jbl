import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { program } from '../lib/program'
import { queryKeys } from '../lib/queryKeys'
import type { LendingAccountData } from '../types/lending'

export type { LendingAccountData }

const LENDING_SEED = 'lending'

async function fetchLendingAccount(
    authority: PublicKey,
    mint: PublicKey,
): Promise<LendingAccountData> {
    const [pda] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode(LENDING_SEED), authority.toBytes(), mint.toBytes()],
        program.programId,
    )
    const data = await program.account.pool.fetch(pda)
    return {
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
        feeConfig: {
            m1: BigInt(data.feeConfig.m1.toString()),
            c1: BigInt(data.feeConfig.c1.toString()),
            m2: BigInt(data.feeConfig.m2.toString()),
            c2: BigInt(data.feeConfig.c2.toString()),
        },
    }
}

/** Fetch a single lending account by authority + mint (PDA derivation). */
export function useLendingAccount(
    authority: PublicKey | null,
    mint: PublicKey | null,
) {
    return useQuery({
        queryKey: queryKeys.lending.one(authority!, mint!),
        queryFn: () => fetchLendingAccount(authority!, mint!),
        enabled: !!authority && !!mint,
    })
}
