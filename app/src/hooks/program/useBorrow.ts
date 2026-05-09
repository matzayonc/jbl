import * as anchor from '@anchor-lang/core'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../lib/queryKeys'
import { handleTransaction } from '../../lib/txHandler'
import { useAnchorProgram } from '../useAnchorProgram'

export interface BorrowParams {
    pool: PublicKey
    lendMint: PublicKey
    /** Raw token amount to borrow (no decimals). */
    amount: anchor.BN
}

/**
 * Borrow lend tokens from a pool against the connected wallet's deposited collateral.
 * Automatically invalidates the pool and user-position queries on success.
 */
export function useBorrow() {
    const { connected, wallet } = useWalletConnection()
    const program = useAnchorProgram()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ pool, lendMint, amount }: BorrowParams) => {
            if (!connected || !wallet || !program) throw new Error('Wallet not connected')

            const authority = new PublicKey(wallet.account.publicKey)

            const tx = await program.methods
                .borrow(amount)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .accounts({ pool, lendMint, authority } as any)
                .transaction()

            tx.feePayer = authority

            return handleTransaction(
                async () => tx,
                wallet,
                { loadingMessage: 'Borrowing…', successMessage: 'Borrow confirmed!' },
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
