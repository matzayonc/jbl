import { connection } from '@/lib/program'
import { MINTER_PUBKEY } from '@/store/wallet.store'
import type { PoolData } from '@/types/lending'
import { getMint } from '@solana/spl-token'
import type { PublicKey } from '@solana/web3.js'
import { useEffect, useState } from 'react'
import { useLendingAccounts } from './useLendingAccounts'

async function hasValidMinter(mint: PublicKey): Promise<boolean> {
    try {
        const info = await getMint(connection, mint)
        return info.mintAuthority?.toBase58() === MINTER_PUBKEY.toBase58()
    } catch {
        return false
    }
}

async function poolHasValidMinter(pool: PoolData): Promise<boolean> {
    const [collateralValid, lendValid] = await Promise.all([
        hasValidMinter(pool.collateralMint),
        hasValidMinter(pool.lendMint),
    ])
    return collateralValid || lendValid
}

/**
 * Returns only pools whose collateral or lend mint has the valid faucet authority.
 * Mirrors the filtering used in useMultiplyStrategies.
 */
export function useValidLendingAccounts() {
    const { data: poolsData = [], isLoading } = useLendingAccounts()
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

    return { data: validPools, isLoading: isLoading || isValidating }
}
