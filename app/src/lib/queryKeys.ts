import type { PublicKey } from '@solana/web3.js'

export const queryKeys = {
    lending: {
        all: () => ['lending', 'pools'] as const,
        one: (authority: PublicKey, mint: PublicKey) =>
            ['lending', 'pool', authority.toBase58(), mint.toBase58()] as const,
    },
    wallet: {
        balances: (address: string) => ['wallet', 'balances', address] as const,
    },
} as const
