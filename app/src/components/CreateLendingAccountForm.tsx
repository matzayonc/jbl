import { useWalletConnection } from '@solana/react-hooks'
import { useCreateLendingPool } from '../hooks/useCreateLendingPool'

interface Props {
    onCreated: () => void
}

export function CreateLendingAccountForm({ onCreated }: Props) {
    const { connected } = useWalletConnection()
    const { status, errorMsg, lastMint, create } = useCreateLendingPool(onCreated)

    if (!connected) {
        return (
            <p className="text-sm text-muted-foreground">
                Connect your wallet to create a lending pool.
            </p>
        )
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
                onClick={create}
                disabled={status === 'pending'}
                className="rounded-md bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600 disabled:opacity-50 transition-colors"
            >
                {status === 'pending' ? 'Creating…' : 'Create Pool'}
            </button>
            {status === 'error' && (
                <p className="text-xs text-red-500 break-all">{errorMsg}</p>
            )}
        </div>
    )
}

