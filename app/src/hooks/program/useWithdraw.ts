import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { program as readonlyProgram } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import { handleTransaction } from '../../lib/txHandler'

export interface WithdrawParams {
    pool: PublicKey
    collateralMint: PublicKey
    /** The user's destination token account for the withdrawn collateral. */
    userTokenAccount: PublicKey
    /** Raw token amount (no decimals). */
    amount: anchor.BN
}

/**
 * Withdraw collateral from a pool (queued if utilization is too high).
 * Automatically invalidates the pool and user-position queries on success.
 */
export function useWithdraw() {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ pool, collateralMint, userTokenAccount, amount }: WithdrawParams) => {
            if (!connected || !wallet) throw new Error('Wallet not connected')

            const authority = new PublicKey(wallet.account.publicKey)

            const tx = await readonlyProgram.methods
                .withdraw(amount)
                .accounts({
                    pool,
                    collateralMint,
                    authority,
                    userTokenAccount,
                })
                .transaction()

            tx.feePayer = authority

            return handleTransaction(
                async () => tx,
                wallet,
                { loadingMessage: 'Withdrawing collateral…', successMessage: 'Withdrawal submitted!' },
            )
        },
        onSuccess: (_data, { pool }) => {
            const authority = wallet ? new PublicKey(wallet.account.publicKey) : null
            queryClient.invalidateQueries({ queryKey: queryKeys.lending.one(pool) })
            if (authority) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.userPosition.one(pool, authority),
                })
            }
        },
    })
}
