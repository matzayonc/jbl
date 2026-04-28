import { useMemo } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import type { WalletSession } from "@solana/client";
import { AnchorProvider, Program } from "@anchor-lang/core";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getTransactionDecoder, getTransactionEncoder } from "@solana/transactions";
import { connection } from "../lib/program";
import type { Jbl } from "../../../target/types/jbl";
import IDL from "../../../target/idl/jbl.json";

const txEncoder = getTransactionEncoder();
const txDecoder = getTransactionDecoder();

/**
 * Bridge a web3.js v1 transaction through WalletSession.signTransaction.
 * Both use the identical Solana wire format so we can round-trip through it.
 */
async function signV1WithSession<T extends Transaction | VersionedTransaction>(
    tx: T,
    session: WalletSession
): Promise<T> {
    if (!session.signTransaction) {
        throw new Error("Connected wallet does not support signTransaction.");
    }
    const wireBytes =
        tx instanceof VersionedTransaction
            ? tx.serialize()
            : tx.serialize({ requireAllSignatures: false });

    const kitTx = txDecoder.decode(wireBytes) as Parameters<typeof session.signTransaction>[0];
    const signedKitTx = await session.signTransaction(kitTx);
    const signedWireBytes = new Uint8Array(txEncoder.encode(signedKitTx));

    if (tx instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(signedWireBytes) as T;
    }
    return Transaction.from(signedWireBytes) as T;
}

/**
 * Returns an AnchorProvider + Program wired to the currently connected wallet.
 * Returns null when no wallet is connected or wallet lacks signTransaction capability.
 */
export function useAnchorProgram(): Program<Jbl> | null {
    const { connected, wallet } = useWalletConnection();

    return useMemo(() => {
        if (!connected || !wallet || !wallet.signTransaction) return null;

        const session = wallet;
        const publicKey = new PublicKey(session.account.publicKey);

        const anchorWallet = {
            publicKey,
            signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) =>
                signV1WithSession(tx, session),
            signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> =>
                Promise.all(txs.map((tx) => signV1WithSession(tx, session))),
        };

        const provider = new AnchorProvider(connection, anchorWallet, { commitment: "confirmed" });
        return new Program<Jbl>(IDL as unknown as Jbl, provider);
    }, [connected, wallet]);
}
