import { useState } from "react";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
    createInitializeMint2Instruction,
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { getTransactionDecoder, getTransactionEncoder } from "@solana/transactions";
import { useWalletConnection } from "@solana/react-hooks";
import type { WalletSession } from "@solana/client";
import { program as readonlyProgram, connection } from "@/lib/program";

const DECIMALS = 6;

const txEncoder = getTransactionEncoder();
const txDecoder = getTransactionDecoder();

/**
 * Sign a partially-constructed web3.js v1 Transaction via WalletSession.signTransaction,
 * then submit the signed wire bytes directly to the RPC.
 *
 * Wallets preserve existing partial signatures (e.g. mintKeypair) when adding their own.
 */
async function signAndSendV1(tx: Transaction, session: WalletSession): Promise<string> {
    if (!session.signTransaction) {
        throw new Error("Wallet does not support signTransaction.");
    }
    const wireBytes = tx.serialize({ requireAllSignatures: false });
    const kitTx = txDecoder.decode(wireBytes) as Parameters<typeof session.signTransaction>[0];
    const signedKitTx = await session.signTransaction(kitTx);
    const signedWireBytes = new Uint8Array(txEncoder.encode(signedKitTx));
    return connection.sendRawTransaction(signedWireBytes, { skipPreflight: false });
}

interface Props {
    onCreated: () => void;
}

export function CreateLendingAccountForm({ onCreated }: Props) {
    const { connected, wallet } = useWalletConnection();

    const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [lastMint, setLastMint] = useState<string | null>(null);

    async function handleCreate() {
        if (!connected || !wallet) return;
        setStatus("pending");
        setErrorMsg("");

        try {
            const payer = new PublicKey(wallet.account.publicKey);
            const mintKeypair = Keypair.generate();

            // ── 1. Create + init mint ──────────────────────────────────────────
            const lamports = await getMinimumBalanceForRentExemptMint(connection);
            const { blockhash: bh1, lastValidBlockHeight: lv1 } = await connection.getLatestBlockhash();

            const mintTx = new Transaction({
                blockhash: bh1,
                lastValidBlockHeight: lv1,
                feePayer: payer,
            }).add(
                SystemProgram.createAccount({
                    fromPubkey: payer,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMint2Instruction(
                    mintKeypair.publicKey,
                    DECIMALS,
                    payer,
                    null,
                ),
            );
            // Pre-sign with the mint keypair; wallet will add its (fee-payer) signature
            mintTx.partialSign(mintKeypair);

            const mintSig = await signAndSendV1(mintTx, wallet);
            console.log("Mint created:", mintKeypair.publicKey.toBase58(), "sig:", mintSig);
            await connection.confirmTransaction(
                { signature: mintSig, blockhash: bh1, lastValidBlockHeight: lv1 },
                "confirmed",
            );

            // ── 2. Create lending account ──────────────────────────────────────
            const { blockhash: bh2, lastValidBlockHeight: lv2 } = await connection.getLatestBlockhash();
            const lendingTx = await readonlyProgram.methods
                .createLendingAccount()
                .accounts({
                    mint: mintKeypair.publicKey,
                    authority: payer,
                    payer,
                })
                .transaction();

            lendingTx.feePayer = payer;
            lendingTx.recentBlockhash = bh2;

            const lendingSig = await signAndSendV1(lendingTx, wallet);
            console.log("Lending account created, sig:", lendingSig);
            await connection.confirmTransaction(
                { signature: lendingSig, blockhash: bh2, lastValidBlockHeight: lv2 },
                "confirmed",
            );

            setLastMint(mintKeypair.publicKey.toBase58());
            onCreated();
            setStatus("idle");
        } catch (e) {
            setErrorMsg(e instanceof Error ? e.message : String(e));
            setStatus("error");
        }
    }

    if (!connected || !wallet) {
        return (
            <p className="text-sm text-muted-foreground">
                Connect your wallet to create a lending pool.
            </p>
        );
    }

    return (
        <div className="rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-sm font-medium">Create a new lending pool</p>
            <p className="text-xs text-muted-foreground">
                A fresh token mint (6 decimals) will be created automatically.
            </p>
            {lastMint && (
                <p className="text-xs text-green-600 font-mono break-all">✓ Mint: {lastMint}</p>
            )}
            <button
                onClick={handleCreate}
                disabled={status === "pending"}
                className="rounded-md bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50 transition-colors"
            >
                {status === "pending" ? "Creating…" : "Create Pool"}
            </button>
            {status === "error" && (
                <p className="text-xs text-red-500 break-all">{errorMsg}</p>
            )}
        </div>
    );
}

