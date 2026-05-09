import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { program as readonlyProgram } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import { handleTransaction } from '../../lib/txHandler'

export interface PutLpParams {
    pool: PublicKey
    /** Raw LP-token amount to burn and credit to the user position. */
    amount: anchor.BN
}

/**
 * Burn LP tokens and credit the equivalent lend-token value to the caller's UserPosition.
 * This is used to convert an LP lender position into collateral credit for borrowing.
 */
export function usePutLp() {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ pool, amount }: PutLpParams) => {
            if (!connected || !wallet) throw new Error('Wallet not connected')

            const authority = new PublicKey(wallet.account.publicKey)

            const tx = await readonlyProgram.methods
                .putLp(amount)
                .accounts({
                    pool,
                    authority,
                })
                .transaction()

            tx.feePayer = authority

            return handleTransaction(
                async () => tx,
                wallet,
                { loadingMessage: 'Depositing LP tokens…', successMessage: 'LP tokens deposited!' },
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
