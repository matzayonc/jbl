import type { PublicKey } from '@solana/web3.js'

export const queryKeys = {
    lending: {
        all: () => ['lending', 'pools'] as const,
        one: (pool: PublicKey) => ['lending', 'pool', pool.toBase58()] as const,
    },
    userPosition: {
        all: () => ['user-positions'] as const,
        byPool: (pool: PublicKey) => ['user-positions', 'pool', pool.toBase58()] as const,
        one: (pool: PublicKey, authority: PublicKey) =>
            ['user-positions', pool.toBase58(), authority.toBase58()] as const,
    },
    wallet: {
        balances: (address: string) => ['wallet', 'balances', address] as const,
    },
} as const
