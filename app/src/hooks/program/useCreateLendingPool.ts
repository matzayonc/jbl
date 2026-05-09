import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import {
    createInitializeMint2Instruction,
    getMinimumBalanceForRentExemptMint,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { connection, program as readonlyProgram } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import { signAndSendV1 } from '../../lib/transactions'
import { handleTransaction } from '../../lib/txHandler'

/** Decimal precision for auto-generated mints. */
const MINT_DECIMALS = 6

/** Space needed for a Pool account (8-byte discriminator + zero-copy struct). */
const POOL_SPACE = 41_192

export interface CreatePoolParams {
    /** Fee config: m1, c1 for low-utilization; m2, c2 for high-utilization. */
    feeConfig?: { m1: number; c1: number; m2: number; c2: number }
    ltvPercent?: number
}

export interface CreatePoolResult {
    poolAddress: PublicKey
    collateralMint: PublicKey
    lendMint: PublicKey
}

async function createPool(
    params: CreatePoolParams,
    wallet: Parameters<typeof signAndSendV1>[1],
    payer: PublicKey,
): Promise<CreatePoolResult> {
    const { feeConfig = { m1: 0, c1: 200, m2: 0, c2: 1000 } } = params

    const collateralMintKeypair = Keypair.generate()
    const lendMintKeypair = Keypair.generate()
    const poolKeypair = Keypair.generate()

    // Step 1: create and initialize both SPL mints in a single transaction
    const mintLamports = await getMinimumBalanceForRentExemptMint(connection)

    await handleTransaction(
        async () => {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: payer })
            tx.add(
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: collateralMintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports: mintLamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMint2Instruction(
                    collateralMintKeypair.publicKey,
                    MINT_DECIMALS,
                    payer,
                    null,
                ),
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: lendMintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports: mintLamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMint2Instruction(
                    lendMintKeypair.publicKey,
                    MINT_DECIMALS,
                    payer,
                    null,
                ),
            )
            tx.partialSign(collateralMintKeypair, lendMintKeypair)
            return tx
        },
        wallet,
        { loadingMessage: 'Creating token mints…', successMessage: 'Mints created' },
    )

    // Step 2: pre-allocate the pool account (avoids 10 KB CPI limit)
    const poolLamports = await connection.getMinimumBalanceForRentExemption(POOL_SPACE)

    await handleTransaction(
        async () => {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: payer })
            tx.add(
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: poolKeypair.publicKey,
                    space: POOL_SPACE,
                    lamports: poolLamports,
                    programId: readonlyProgram.programId,
                }),
            )
            tx.partialSign(poolKeypair)
            return tx
        },
        wallet,
        { loadingMessage: 'Allocating pool account…', successMessage: 'Pool account allocated' },
    )

    // Step 3: initialize the pool via the `create` instruction
    const createTx = await readonlyProgram.methods
        .create(
            new anchor.BN(feeConfig.m1),
            new anchor.BN(feeConfig.c1),
            new anchor.BN(feeConfig.m2),
            new anchor.BN(feeConfig.c2),
        )
        .accounts({
            pool: poolKeypair.publicKey,
            collateralMint: collateralMintKeypair.publicKey,
            lendMint: lendMintKeypair.publicKey,
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

    return {
        poolAddress: poolKeypair.publicKey,
        collateralMint: collateralMintKeypair.publicKey,
        lendMint: lendMintKeypair.publicKey,
    }
}

export interface UseCreateLendingPoolOptions {
    onCreated?: (result: CreatePoolResult) => void
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
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.lending.all() })
            options.onCreated?.(result)
        },
    })
}
