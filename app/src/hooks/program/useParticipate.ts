import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { program as readonlyProgram } from '../../lib/program'
import { queryKeys } from '../../lib/queryKeys'
import { handleTransaction } from '../../lib/txHandler'

export interface ParticipateParams {
    pool: PublicKey
    lendMint: PublicKey
    /** The user's source token account holding the lend tokens to deposit. */
    userLendTokenAccount: PublicKey
    /** Raw lend-token amount to deposit (no decimals). */
    amount: anchor.BN
}

/**
 * Deposit lend tokens into a pool (lender side).
 * On success, LP tokens are minted to the caller's LP token account.
 * Automatically invalidates the pool query on success.
 */
export function useParticipate() {
    const { connected, wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ pool, lendMint, userLendTokenAccount, amount }: ParticipateParams) => {
            if (!connected || !wallet) throw new Error('Wallet not connected')

            const authority = new PublicKey(wallet.account.publicKey)

            const tx = await readonlyProgram.methods
                .participate(amount)
                .accounts({
                    pool,
                    lendMint,
                    authority,
                    userLendTokenAccount,
                })
                .transaction()

            tx.feePayer = authority

            return handleTransaction(
                async () => tx,
                wallet,
                { loadingMessage: 'Depositing lend tokens…', successMessage: 'Deposit confirmed!' },
            )
        },
        onSuccess: (_data, { pool }) => {
            const authority = wallet ? new PublicKey(wallet.account.publicKey) : null
            queryClient.invalidateQueries({ queryKey: queryKeys.lending.one(pool) })
            if (authority) {
                queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balances(authority.toBase58()) })
            }
        },
    })
}
