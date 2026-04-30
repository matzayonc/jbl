import { useMemo } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useWalletConnection } from '@solana/react-hooks'
import { FaucetButton } from './FaucetButton'
import { Button } from './ui/button'
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
                    <Button
                        onClick={() => disconnect()}
                        variant="outline"
                        className="border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                        Disconnect
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-2">
            {connectors.map((c) => (
                <Button
                    key={c.id}
                    onClick={() => connect(c.id)}
                    disabled={connecting}
                    className="bg-accent text-white hover:opacity-90"
                >
                    {connecting ? 'Connecting…' : `Connect ${c.name}`}
                </Button>
            ))}
            {connectors.length === 0 && (
                <p className="text-sm text-gray-400">No wallets detected</p>
            )}
        </div>
    )
}
