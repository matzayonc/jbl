import type { PublicKey } from '@solana/web3.js'

export interface UtilizationFeeConfig {
    m1: bigint
    c1: bigint
    m2: bigint
    c2: bigint
}

export interface LendingAccountData {
    publicKey: PublicKey
    authority: PublicKey
    mint: PublicKey
    lpMint: PublicKey
    totalDeposited: bigint
    totalBorrowed: bigint
    totalLpIssued: bigint
    lastAccrualTs: bigint
    bump: number
    lpMintBump: number
    feeConfig: UtilizationFeeConfig
}
