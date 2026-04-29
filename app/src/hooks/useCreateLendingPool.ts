import { useState } from 'react'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import {
    createInitializeMint2Instruction,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token'
import { useWalletConnection } from '@solana/react-hooks'
import { program as readonlyProgram, connection } from '../lib/program'
import { signAndSendV1 } from '../lib/transactions'

const DECIMALS = 6

interface UseCreateLendingPoolResult {
    status: 'idle' | 'pending' | 'error'
    errorMsg: string
    lastMint: string | null
    create: () => Promise<void>
}

export function useCreateLendingPool(onCreated: () => void): UseCreateLendingPoolResult {
    const { connected, wallet } = useWalletConnection()
    const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const [lastMint, setLastMint] = useState<string | null>(null)

    async function create() {
        if (!connected || !wallet) return
        setStatus('pending')
        setErrorMsg('')

        try {
            const payer = new PublicKey(wallet.account.publicKey)
            const mintKeypair = Keypair.generate()

            // Step 1: create and initialize the SPL mint
            const lamports = await getMinimumBalanceForRentExemptMint(connection)
            const { blockhash: bh1, lastValidBlockHeight: lv1 } = await connection.getLatestBlockhash()

            const mintTx = new Transaction({ blockhash: bh1, lastValidBlockHeight: lv1, feePayer: payer }).add(
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMint2Instruction(mintKeypair.publicKey, DECIMALS, payer, null),
            )
            mintTx.partialSign(mintKeypair)

            const mintSig = await signAndSendV1(mintTx, wallet)
            await connection.confirmTransaction({ signature: mintSig, blockhash: bh1, lastValidBlockHeight: lv1 }, 'confirmed')

            // Step 2: create the lending account PDA
            const { blockhash: bh2, lastValidBlockHeight: lv2 } = await connection.getLatestBlockhash()
            const lendingTx = await readonlyProgram.methods
                .create(50) // 50 bps = 0.5% fee
                .accounts({ mint: mintKeypair.publicKey, authority: payer, payer })
                .transaction()

            lendingTx.feePayer = payer
            lendingTx.recentBlockhash = bh2

            const lendingSig = await signAndSendV1(lendingTx, wallet)
            await connection.confirmTransaction({ signature: lendingSig, blockhash: bh2, lastValidBlockHeight: lv2 }, 'confirmed')

            setLastMint(mintKeypair.publicKey.toBase58())
            setStatus('idle')
            onCreated()
        } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : String(e))
            setStatus('error')
        }
    }

    return { status, errorMsg, lastMint, create }
}
