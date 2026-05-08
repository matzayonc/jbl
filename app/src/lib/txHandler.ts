import { toast } from 'react-toastify'
import type { WalletSession } from '@solana/client'
import { Transaction } from '@solana/web3.js'
import { connection } from './program'
import { signAndSendV1 } from './transactions'

export interface TxOptions {
    /** Toast label shown while tx is in flight. */
    loadingMessage?: string
    /** Toast label on confirmed. */
    successMessage?: string
    /** Toast label on error (falls back to the error message). */
    errorMessage?: string
}

export interface TxResult {
    signature: string
}

/**
 * Unified blockchain transaction handler.
 *
 * - Wraps sign → send → confirm in a single call.
 * - Displays a loading toast while the tx is in flight.
 * - Resolves with the signature on success, throws on failure.
 * - Callers (useMutation onSuccess/onError) can add extra invalidation logic.
 */
export async function handleTransaction(
    buildTx: () => Promise<Transaction>,
    wallet: WalletSession,
    options: TxOptions = {},
): Promise<TxResult> {
    const {
        loadingMessage = 'Sending transaction…',
        successMessage = 'Transaction confirmed',
        errorMessage,
    } = options

    const toastId = toast.loading(loadingMessage)

    try {
        const tx = await buildTx()
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
        tx.recentBlockhash = tx.recentBlockhash ?? blockhash
        tx.feePayer = tx.feePayer

        const signature = await signAndSendV1(tx, wallet)

        await connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            'confirmed',
        )

        toast.update(toastId, {
            render: successMessage,
            type: 'success',
            isLoading: false,
            autoClose: 4000,
        })

        return { signature }
    } catch (err) {
        const message = errorMessage ?? (err instanceof Error ? err.message : String(err))

        toast.update(toastId, {
            render: message,
            type: 'error',
            isLoading: false,
            autoClose: 6000,
        })

        throw err
    }
}
