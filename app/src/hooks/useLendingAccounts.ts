import { useQuery } from '@tanstack/react-query'
import { program } from '../lib/program'
import { queryKeys } from '../lib/queryKeys'
import type { LendingAccountData } from '../types/lending'

export type { LendingAccountData }

async function fetchAllLendingAccounts(): Promise<LendingAccountData[]> {
    const all = await program.account.pool.all()
    return all.map(({ publicKey, account }) => ({
        publicKey,
        authority: account.authority,
        mint: account.mint,
        lpMint: account.lpMint,
        totalDeposited: BigInt(account.totalDeposited.toString()),
        totalBorrowed: BigInt(account.totalBorrowed.toString()),
        totalLpIssued: BigInt(account.totalLpIssued.toString()),
        lastAccrualTs: BigInt(account.lastAccrualTs.toString()),
        bump: account.bump,
        lpMintBump: account.lpMintBump,
        feeConfig: {
            m1: BigInt(account.feeConfig.m1.toString()),
            c1: BigInt(account.feeConfig.c1.toString()),
            m2: BigInt(account.feeConfig.m2.toString()),
            c2: BigInt(account.feeConfig.c2.toString()),
        },
    }))
}

export function useLendingAccounts() {
    return useQuery({
        queryKey: queryKeys.lending.all(),
        queryFn: fetchAllLendingAccounts,
    })
}
