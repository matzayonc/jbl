import { Transaction, VersionedTransaction } from '@solana/web3.js'
import { getTransactionDecoder, getTransactionEncoder } from '@solana/transactions'
import type { WalletSession } from '@solana/client'
import { connection } from './program'

const txEncoder = getTransactionEncoder()
const txDecoder = getTransactionDecoder()

/**
 * Sign a web3.js v1 Transaction via WalletSession.signTransaction and broadcast it.
 * Preserves any existing partial signatures (e.g. from ephemeral keypairs).
 */
export async function signAndSendV1(tx: Transaction, session: WalletSession): Promise<string> {
    if (!session.signTransaction) {
        throw new Error('Connected wallet does not support signTransaction.')
    }
    const wireBytes = tx.serialize({ requireAllSignatures: false })
    const kitTx = txDecoder.decode(wireBytes) as Parameters<typeof session.signTransaction>[0]
    const signedKitTx = await session.signTransaction(kitTx)
    const signedWireBytes = new Uint8Array(txEncoder.encode(signedKitTx))
    return connection.sendRawTransaction(signedWireBytes, { skipPreflight: false })
}

/**
 * Bridge a web3.js v1 / VersionedTransaction through WalletSession.signTransaction.
 * Used by the Anchor wallet adapter.
 */
export async function signV1WithSession<T extends Transaction | VersionedTransaction>(
    tx: T,
    session: WalletSession,
): Promise<T> {
    if (!session.signTransaction) {
        throw new Error('Connected wallet does not support signTransaction.')
    }
    const wireBytes =
        tx instanceof VersionedTransaction
            ? tx.serialize()
            : tx.serialize({ requireAllSignatures: false })

    const kitTx = txDecoder.decode(wireBytes) as Parameters<typeof session.signTransaction>[0]
    const signedKitTx = await session.signTransaction(kitTx)
    const signedWireBytes = new Uint8Array(txEncoder.encode(signedKitTx))

    if (tx instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(signedWireBytes) as T
    }
    return Transaction.from(signedWireBytes) as T
}
