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
import { connection } from '../lib/program'
import { queryKeys } from '../lib/queryKeys'
import { handleTransaction } from '../lib/txHandler'
import { MINTER_KEYPAIR, useWalletBalancesStore } from '../store/wallet.store'

const FAUCET_AMOUNT = 1_000_000_000 // 1 000 tokens at 6 decimals

/**
 * Mutation hook for minting all provided test tokens in a single transaction.
 */
export function useFaucetAll(mints: PublicKey[]) {
    const { wallet } = useWalletConnection()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            if (!wallet) throw new Error('Wallet not connected')
            if (mints.length === 0) throw new Error('No mints provided')

            const payer = new PublicKey(wallet.account.publicKey)

            const result = await handleTransaction(
                async () => {
                    const tx = new Transaction()
                    tx.feePayer = payer
                    const { blockhash } = await connection.getLatestBlockhash()
                    tx.recentBlockhash = blockhash

                    for (const mint of mints) {
                        const ata = getAssociatedTokenAddressSync(
                            mint, payer, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
                        )
                        tx.add(
                            createAssociatedTokenAccountIdempotentInstruction(
                                payer, ata, payer, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
                            ),
                            createMintToInstruction(mint, ata, MINTER_KEYPAIR.publicKey, FAUCET_AMOUNT),
                        )
                    }

                    tx.partialSign(MINTER_KEYPAIR)
                    return tx
                },
                wallet,
                {
                    loadingMessage: 'Minting test tokens…',
                    successMessage: `${mints.length} tokens minted to your wallet`,
                    errorMessage: 'Faucet failed — mint authority mismatch',
                },
            )
            return result
        },
        onSuccess: () => {
            const address = wallet ? String(wallet.account.address) : null
            if (address) {
                queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balances(address) })
                void useWalletBalancesStore.getState().fetch(address)
            }
        },
    })
}

/**
 * Mutation hook for minting test tokens to the connected wallet.
 * Uses a hardcoded minter keypair as the mint authority.
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

            const result = await handleTransaction(
                async () => {
                    const tx = new Transaction()
                    tx.feePayer = payer
                    
                    // Get blockhash first - needed before partialSign
                    const { blockhash } = await connection.getLatestBlockhash()
                    tx.recentBlockhash = blockhash
                    
                    tx.add(
                        createAssociatedTokenAccountIdempotentInstruction(
                            payer, ata, payer, mint,
                            TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
                        ),
                        createMintToInstruction(mint, ata, MINTER_KEYPAIR.publicKey, FAUCET_AMOUNT),
                    )
                    // Sign with hardcoded minter before wallet signs
                    tx.partialSign(MINTER_KEYPAIR)
                    return tx
                },
                wallet,
                {
                    loadingMessage: 'Minting test tokens…',
                    successMessage: '1 000 tokens minted to your wallet',
                    errorMessage: 'Faucet failed — mint authority mismatch',
                },
            )
            return result
        },
        onSuccess: (_data, _vars, _ctx) => {
            // Refresh balances for the connected wallet
            const address = wallet ? String(wallet.account.address) : null
            if (address) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.wallet.balances(address),
                })
                void useWalletBalancesStore.getState().fetch(address)
            }
        },
    })
}
