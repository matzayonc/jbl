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
import { connection, program as readonlyProgram } from '../lib/program'
import { queryKeys } from '../lib/queryKeys'
import { signAndSendV1 } from '../lib/transactions'
import { handleTransaction } from '../lib/txHandler'

const DECIMALS = 6

async function createLendingPool(wallet: Parameters<typeof signAndSendV1>[1], payer: PublicKey) {
    const mintKeypair = Keypair.generate()

    // Step 1: create and initialize the SPL mint
    const lamports = await getMinimumBalanceForRentExemptMint(connection)
    const { blockhash: bh1, lastValidBlockHeight: lv1 } = await connection.getLatestBlockhash()

    const mintTx = new Transaction({ blockhash: bh1, lastValidBlockHeight: lv1, feePayer: payer }).add(
        SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(mintKeypair.publicKey, DECIMALS, payer, null),
    )
    mintTx.partialSign(mintKeypair)

    await handleTransaction(
        async () => mintTx,
        wallet,
        { loadingMessage: 'Creating mint…', successMessage: 'Mint created' },
    )

    // Step 2: create the lending account PDA
    const lendingTx = await readonlyProgram.methods
        .create(
            new anchor.BN(0),
            new anchor.BN(200),
            new anchor.BN(1000),
            new anchor.BN(0),
        )
        .accounts({ mint: mintKeypair.publicKey, authority: payer, payer })
        .transaction()

    lendingTx.feePayer = payer

    await handleTransaction(
        async () => lendingTx,
        wallet,
        { loadingMessage: 'Creating lending pool…', successMessage: 'Lending pool created!' },
    )

    return mintKeypair.publicKey.toBase58()
}

export function useCreateLendingPool(onCreated?: () => void) {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => {
            if (!connected || !wallet) throw new Error('Wallet not connected')
            const payer = new PublicKey(wallet.account.publicKey)
            return createLendingPool(wallet, payer)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.lending.all() })
            onCreated?.()
        },
    })
}
