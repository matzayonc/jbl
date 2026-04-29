import type { PublicKey } from '@solana/web3.js'

export interface LendingAccountData {
    publicKey: PublicKey
    authority: PublicKey
    mint: PublicKey
    lpMint: PublicKey
    totalDeposited: bigint
    totalBorrowed: bigint
    totalLpIssued: bigint
    lastUpdateSlot: bigint
    bump: number
    lpMintBump: number
    borrowFeeBps: number
}
