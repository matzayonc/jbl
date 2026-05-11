import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { program } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import type { UserPositionData } from '../../types/lending'

export type { UserPositionData }

function mapUserPosition(
    publicKey: PublicKey,
    data: Awaited<ReturnType<typeof program.account.userPosition.fetch>>,
): UserPositionData {
    return {
        publicKey,
        authority: data.authority,
        pool: data.pool,
        collateralDeposited: BigInt(data.collateralDeposited.toString()),
        debtShares: BigInt(data.debtShares.toString()),
        bump: data.bump,
    }
}

/** Derive the UserPosition PDA address for a given pool + authority pair. */
export function getUserPositionAddress(pool: PublicKey, authority: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('user_position'),
            pool.toBytes(),
            authority.toBytes(),
        ],
        program.programId,
    )
    return pda
}

/** Fetch a single UserPosition by pool + authority. Returns null if the account doesn't exist. */
export function useUserPosition(pool: PublicKey | null, authority: PublicKey | null) {
    return useQuery({
        queryKey: pool && authority ? queryKeys.userPosition.one(pool, authority) : ['user-positions', 'null', 'null'],
        queryFn: async () => {
            const pda = getUserPositionAddress(pool!, authority!)
            const data = await program.account.userPosition.fetchNullable(pda)
            if (!data) return null
            return mapUserPosition(pda, data)
        },
        enabled: !!pool && !!authority,
    })
}

/** Fetch all UserPosition accounts on-chain. */
export function useUserPositions() {
    return useQuery({
        queryKey: queryKeys.userPosition.all(),
        queryFn: async () => {
            const all = await program.account.userPosition.all()
            return all.map(({ publicKey, account }) => mapUserPosition(publicKey, account))
        },
    })
}

/** Fetch all UserPosition accounts for a specific pool. */
export function useUserPositionsByPool(pool: PublicKey | null) {
    return useQuery({
        queryKey: pool ? queryKeys.userPosition.byPool(pool) : ['user-positions', 'pool', 'null'],
        queryFn: async () => {
            const all = await program.account.userPosition.all()
            return all
                .filter(({ account }) => account.pool.equals(pool!))
                .map(({ publicKey, account }) => mapUserPosition(publicKey, account))
        },
        enabled: !!pool,
    })
}

/**
 * Fetch all UserPosition accounts owned by a specific authority.
 * Uses a memcmp filter (offset 8 = after discriminator) for on-chain efficiency.
 */
export function useUserPositionsByAuthority(authority: PublicKey | null) {
    return useQuery({
        queryKey: authority ? queryKeys.userPosition.byAuthority(authority) : ['user-positions', 'authority', 'null'],
        queryFn: async () => {
            const all = await program.account.userPosition.all([
                {
                    memcmp: {
                        offset: 8, // authority field starts after 8-byte discriminator
                        bytes: authority!.toBase58(),
                    },
                },
            ])
            return all.map(({ publicKey, account }) => mapUserPosition(publicKey, account))
        },
        enabled: !!authority,
    })
}
