import { useWalletConnection } from '@solana/react-hooks'
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    createMintToInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { PublicKey, Transaction } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
import { handleTransaction } from '../lib/txHandler'

const FAUCET_AMOUNT = 1_000_000_000 // 1 000 tokens at 6 decimals

/**
 * Mutation hook for minting test tokens to the connected wallet.
 * The wallet must be the mint authority of the given mint.
 *
 * Automatically invalidates wallet balances on success so all balance
 * displays update without a manual refresh.
 */
export function useFaucet(mint: PublicKey) {
    const { wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            if (!wallet) throw new Error('Wallet not connected')

            const payer = new PublicKey(wallet.account.publicKey)
            const ata = getAssociatedTokenAddressSync(
                mint,
                payer,
                false,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID,
            )

            await handleTransaction(
                async () => {
                    const tx = new Transaction()
                    tx.feePayer = payer
                    tx.add(
                        createAssociatedTokenAccountIdempotentInstruction(
                            payer, ata, payer, mint,
                            TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
                        ),
                        createMintToInstruction(mint, ata, payer, FAUCET_AMOUNT),
                    )
                    return tx
                },
                wallet,
                {
                    loadingMessage: 'Minting test tokens…',
                    successMessage: '1 000 tokens minted to your wallet',
                    errorMessage: 'Faucet failed — are you the mint authority?',
                },
            )
        },
        onSuccess: (_data, _vars, _ctx) => {
            // Refresh balances for the connected wallet
            const address = wallet ? String(wallet.account.address) : null
            if (address) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.wallet.balances(address),
                })
            }
        },
    })
}
