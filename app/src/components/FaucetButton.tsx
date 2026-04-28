import { useState } from 'react'
import { PublicKey, Transaction } from '@solana/web3.js'
import {
    createAssociatedTokenAccountIdempotentInstruction,
    createMintToInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { useWalletConnection } from '@solana/react-hooks'
import { getTransactionDecoder, getTransactionEncoder } from '@solana/transactions'
import type { WalletSession } from '@solana/client'
import { connection } from '../lib/program'

const txEncoder = getTransactionEncoder()
const txDecoder = getTransactionDecoder()

async function signAndSendV1(tx: Transaction, session: WalletSession): Promise<string> {
    if (!session.signTransaction) throw new Error('Wallet does not support signTransaction.')
    const wireBytes = tx.serialize({ requireAllSignatures: false })
    const kitTx = txDecoder.decode(wireBytes) as Parameters<typeof session.signTransaction>[0]
    const signedKitTx = await session.signTransaction(kitTx)
    const signedWireBytes = new Uint8Array(txEncoder.encode(signedKitTx))
    return connection.sendRawTransaction(signedWireBytes, { skipPreflight: false })
}

interface FaucetButtonProps {
    /** The underlying token mint of the lending pool. The connected wallet must be its mint authority. */
    mint: PublicKey
}

const MINT_AMOUNT = 1_000_000_000 // 1 000 tokens (6 decimals)

export function FaucetButton({ mint }: FaucetButtonProps) {
    const { wallet } = useWalletConnection()
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    async function handleMint() {
        if (!wallet) return
        setStatus('loading')
        try {
            const payer = new PublicKey(wallet.account.publicKey)
            const ata = getAssociatedTokenAddressSync(mint, payer)

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
            const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: payer })
                .add(
                    // Create the ATA if it doesn't exist yet (idempotent — safe to repeat)
                    createAssociatedTokenAccountIdempotentInstruction(
                        payer, ata, payer, mint,
                        TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
                    ),
                    // Mint MINT_AMOUNT tokens to the ATA; wallet is the mint authority
                    createMintToInstruction(mint, ata, payer, MINT_AMOUNT),
                )

            const sig = await signAndSendV1(tx, wallet)
            await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
            setStatus('success')
            setTimeout(() => setStatus('idle'), 2000)
        } catch (e) {
            console.error('Faucet mint failed:', e)
            setStatus('error')
            setTimeout(() => setStatus('idle'), 2000)
        }
    }

    const label =
        status === 'loading' ? 'Minting…' :
            status === 'success' ? 'Minted!' :
                status === 'error' ? 'Failed' :
                    'Faucet'

    return (
        <button
            onClick={handleMint}
            disabled={status === 'loading' || !wallet}
            className="rounded-lg border border-blue-400 px-4 py-2 text-sm text-blue-500 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950"
        >
            {label}
        </button>
    )
}
