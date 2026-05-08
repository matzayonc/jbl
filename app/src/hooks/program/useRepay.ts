import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { program as readonlyProgram } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import { handleTransaction } from '../../lib/txHandler'

export interface RepayParams {
    pool: PublicKey
    lendMint: PublicKey
    /** Raw token amount to repay (no decimals). Use a very large BN to repay in full. */
    amount: anchor.BN
}

/**
 * Repay all or part of an open borrow position.
 * Automatically invalidates the pool and user-position queries on success.
 */
export function useRepay() {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ pool, lendMint, amount }: RepayParams) => {
            if (!connected || !wallet) throw new Error('Wallet not connected')

            const authority = new PublicKey(wallet.account.publicKey)

            const tx = await readonlyProgram.methods
                .repay(amount)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .accounts({ pool, lendMint, authority } as any)
                .transaction()

            tx.feePayer = authority

            return handleTransaction(
                async () => tx,
                wallet,
                { loadingMessage: 'Repaying…', successMessage: 'Repayment confirmed!' },
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
