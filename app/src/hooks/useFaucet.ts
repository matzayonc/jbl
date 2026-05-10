import { useWalletConnection } from '@solana/react-hooks'
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    createMintToInstruction,
    getAssociatedTokenAddressSync,
    getMint,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { Keypair, PublicKey, Transaction } from '@solana/web3.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
import { connection } from '../lib/program'
import { handleTransaction } from '../lib/txHandler'

const FAUCET_AMOUNT = 1_000_000_000 // 1 000 tokens at 6 decimals

// Hardcoded minter keypair for proof-of-concept faucet
// This allows anyone to mint test tokens without being the mint authority
const MINTER_SECRET_KEY = new Uint8Array([164,83,220,177,59,188,88,49,200,58,85,66,67,49,29,78,136,239,249,139,109,48,103,122,207,63,58,166,208,94,29,195,235,76,64,246,35,186,222,243,110,94,56,145,95,144,26,200,237,159,61,219,114,138,224,39,254,99,89,216,19,83,205,82])
const MINTER_KEYPAIR = Keypair.fromSecretKey(MINTER_SECRET_KEY)

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
            }
        },
    })
}
