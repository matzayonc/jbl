import { useQuery } from '@tanstack/react-query'
import { program } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import type { PoolData } from '../../types/lending'
import { _mapPool } from './useLendingAccount'

export type { PoolData }

async function fetchAllPools(): Promise<PoolData[]> {
    const all = await program.account.pool.all()
    return all.map(({ publicKey, account }) => _mapPool(publicKey, account))
}

export function useLendingAccounts() {
    return useQuery({
        queryKey: queryKeys.lending.all(),
        queryFn: fetchAllPools,
    })
}
