import type { PublicKey } from '@solana/web3.js'

export type TokenProgram = 'spl' | 'spl2022'

export interface TokenBalance {
    /** Token mint address */
    mint: PublicKey
    /** Associated token account address */
    ata: PublicKey
    /** Raw amount (no decimals applied) */
    amount: bigint
    decimals: number
    /** Human-readable amount (amount / 10^decimals), null if overflow */
    uiAmount: number | null
    program: TokenProgram
}

export interface WalletBalances {
    /** SOL balance in lamports */
    lamports: bigint
    /** All SPL + SPL-2022 token accounts with non-zero balance */
    tokens: TokenBalance[]
}
