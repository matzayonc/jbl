import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { program as readonlyProgram } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import { handleTransaction } from '../../lib/txHandler'

export interface TakeLpParams {
    pool: PublicKey
    /** Raw LP-token amount to mint and send to the caller's LP token account. */
    amount: anchor.BN
}

/**
 * Claim LP tokens owed from the caller's UserPosition to their wallet.
 * Call this after `put_lp` or after a participate-based position accrues LP credit.
 */
export function useTakeLp() {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ pool, amount }: TakeLpParams) => {
            if (!connected || !wallet) throw new Error('Wallet not connected')

            const authority = new PublicKey(wallet.account.publicKey)

            const tx = await readonlyProgram.methods
                .takeLp(amount)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .accounts({ pool, authority } as any)
                .transaction()

            tx.feePayer = authority

            return handleTransaction(
                async () => tx,
                wallet,
                { loadingMessage: 'Claiming LP tokens…', successMessage: 'LP tokens claimed!' },
            )
        },
        onSuccess: (_data, { pool }) => {
            const authority = wallet ? new PublicKey(wallet.account.publicKey) : null
            queryClient.invalidateQueries({ queryKey: queryKeys.lending.one(pool) })
            if (authority) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.userPosition.one(pool, authority),
                })
                queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balances(authority.toBase58()) })
            }
        },
    })
}
