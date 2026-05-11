import { isTokenValid, POOL_BLACKLIST } from '@/lib/validation'
import type { PoolData } from '@/types/lending'
import { useEffect, useState } from 'react'
import { useLendingAccounts } from './useLendingAccounts'

async function poolHasValidMinter(pool: PoolData): Promise<boolean> {
    if (POOL_BLACKLIST.has(pool.publicKey.toBase58())) return false
    if (pool.ltvPercent <= 75) return false
    const [collateralValid, lendValid] = await Promise.all([
        isTokenValid(pool.collateralMint),
        isTokenValid(pool.lendMint),
    ])
    return collateralValid || lendValid
}

/**
 * Returns only pools whose collateral or lend mint has the valid faucet authority.
 * Mirrors the filtering used in useMultiplyStrategies.
 */
export function useValidLendingAccounts() {
    const { data: poolsData = [], isLoading, error } = useLendingAccounts()
    const [validPools, setValidPools] = useState<PoolData[]>([])
    const [isValidating, setIsValidating] = useState(false)

    useEffect(() => {
        if (poolsData.length === 0) {
            setValidPools([])
            return
        }
        setIsValidating(true)
        Promise.all(
            poolsData.map(async (pd) => {
                const isValid = await poolHasValidMinter(pd)
                return { pd, isValid }
            }),
        )
            .then((results) => {
                setValidPools(results.filter((r) => r.isValid).map((r) => r.pd))
                setIsValidating(false)
            })
            .catch(() => {
                setValidPools([])
                setIsValidating(false)
            })
    }, [poolsData])

    return { data: validPools, isLoading: isLoading || isValidating, error: error };
}
