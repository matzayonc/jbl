import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { program } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import type { PoolData } from '../../types/lending'

export type { PoolData }

function mapPool(publicKey: PublicKey, data: Awaited<ReturnType<typeof program.account.pool.fetch>>): PoolData {
    return {
        publicKey,
        authority: data.authority,
        collateralMint: data.collateralMint,
        lendMint: data.lendMint,
        lpMint: data.lpMint,
        totalCollateralDeposited: BigInt(data.totalCollateralDeposited.toString()),
        totalLendDeposited: BigInt(data.totalLendDeposited.toString()),
        totalBorrowed: BigInt(data.totalBorrowed.toString()),
        totalDebtShares: BigInt(data.totalDebtShares.toString()),
        lastAccrualTs: BigInt(data.lastAccrualTs.toString()),
        totalLpIssued: BigInt(data.totalLpIssued.toString()),
        lpMintBump: data.lpMintBump,
        ltvPercent: data.ltvPercent,
        feeConfig: {
            m1: BigInt(data.feeConfig.m1.toString()),
            c1: BigInt(data.feeConfig.c1.toString()),
            m2: BigInt(data.feeConfig.m2.toString()),
            c2: BigInt(data.feeConfig.c2.toString()),
        },
    }
}

/** Fetch a single pool account by its public key. */
export function useLendingAccount(pool: PublicKey | null) {
    return useQuery({
        queryKey: pool ? queryKeys.lending.one(pool) : ['lending', 'pool', 'null'],
        queryFn: async () => {
            const data = await program.account.pool.fetch(pool!)
            return mapPool(pool!, data)
        },
        enabled: !!pool,
    })
}

export { mapPool as _mapPool }
