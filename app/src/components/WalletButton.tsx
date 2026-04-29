import { useMemo } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useWalletConnection } from '@solana/react-hooks'
import { FaucetButton } from './FaucetButton'
import { useLendingAccounts } from '../hooks/useLendingAccounts'

export function WalletButton() {
    const { connected, connecting, connectors, connect, disconnect, wallet } =
        useWalletConnection()
    const { accounts } = useLendingAccounts()

    const userMint = useMemo((): PublicKey | null => {
        if (!wallet?.account.publicKey) return null
        const userKey = new PublicKey(wallet.account.publicKey).toBase58()
        const acc = accounts.find((a) => a.authority.toBase58() === userKey)
        return acc ? acc.mint : null
    }, [accounts, wallet])

    if (connected && wallet) {
        const addr = String(wallet.account.address)
        return (
            <div className="flex flex-col items-center gap-2">
                <p className="font-mono text-sm text-gray-500">
                    {addr.slice(0, 4)}…{addr.slice(-4)}
                </p>
                <div className="flex gap-2">
                    {userMint && <FaucetButton mint={userMint} />}
                    <button
                        onClick={() => disconnect()}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-2">
            {connectors.map((c) => (
                <button
                    key={c.id}
                    onClick={() => connect(c.id)}
                    disabled={connecting}
                    className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                    {connecting ? 'Connecting…' : `Connect ${c.name}`}
                </button>
            ))}
            {connectors.length === 0 && (
                <p className="text-sm text-gray-400">No wallets detected</p>
            )}
        </div>
    )
}
