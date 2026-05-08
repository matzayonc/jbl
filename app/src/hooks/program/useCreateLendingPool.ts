import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { connection, program as readonlyProgram } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import { signAndSendV1 } from '../../lib/transactions'
import { handleTransaction } from '../../lib/txHandler'

/** Space needed for a Pool account (8-byte discriminator + zero-copy struct). */
const POOL_SPACE = 41_192

export interface CreatePoolParams {
    collateralMint: PublicKey
    lendMint: PublicKey
    /** Fee config: m1, c1 for low-utilization; m2, c2 for high-utilization. */
    feeConfig?: { m1: number; c1: number; m2: number; c2: number }
    ltvPercent?: number
}

async function createPool(
    params: CreatePoolParams,
    wallet: Parameters<typeof signAndSendV1>[1],
    payer: PublicKey,
): Promise<PublicKey> {
    const { collateralMint, lendMint, feeConfig = { m1: 0, c1: 200, m2: 0, c2: 1000 } } = params
    const poolKeypair = Keypair.generate()

    // Step 1: pre-allocate the pool account (avoids 10 KB CPI limit)
    const lamports = await connection.getMinimumBalanceForRentExemption(POOL_SPACE)

    await handleTransaction(
        async () => {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            const tx = new anchor.web3.Transaction({ blockhash, lastValidBlockHeight, feePayer: payer })
            tx.add(
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: poolKeypair.publicKey,
                    space: POOL_SPACE,
                    lamports,
                    programId: readonlyProgram.programId,
                }),
            )
            tx.partialSign(poolKeypair)
            return tx
        },
        wallet,
        { loadingMessage: 'Allocating pool account…', successMessage: 'Pool account allocated' },
    )

    // Step 2: initialize the pool via the `create` instruction
    const createTx = await readonlyProgram.methods
        .create(
            new anchor.BN(feeConfig.m1),
            new anchor.BN(feeConfig.c1),
            new anchor.BN(feeConfig.m2),
            new anchor.BN(feeConfig.c2),
        )
        .accounts({
            pool: poolKeypair.publicKey,
            collateralMint,
            lendMint,
            authority: payer,
            payer,
        })
        .transaction()

    createTx.feePayer = payer

    await handleTransaction(
        async () => createTx,
        wallet,
        { loadingMessage: 'Initializing pool…', successMessage: 'Pool created!' },
    )

    return poolKeypair.publicKey
}

export interface UseCreateLendingPoolOptions {
    onCreated?: (poolAddress: PublicKey) => void
}

export function useCreateLendingPool(options: UseCreateLendingPoolOptions = {}) {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (params: CreatePoolParams) => {
            if (!connected || !wallet) throw new Error('Wallet not connected')
            const payer = new PublicKey(wallet.account.publicKey)
            return createPool(params, wallet, payer)
        },
        onSuccess: (poolAddress) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.lending.all() })
            options.onCreated?.(poolAddress)
        },
    })
}
