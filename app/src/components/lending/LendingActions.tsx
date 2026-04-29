interface Props {
    amount: string
    onAmountChange: (value: string) => void
    onSupply: () => void
    onBorrow: () => void
    onRepay: () => void
    isSupplying: boolean
    isBorrowing: boolean
    isRepaying: boolean
    error: string | null
}

export function LendingActions({
    amount,
    onAmountChange,
    onSupply,
    onBorrow,
    onRepay,
    isSupplying,
    isBorrowing,
    isRepaying,
    error,
}: Props) {
    const busy = isSupplying || isBorrowing || isRepaying

    return (
        <div className="space-y-3 pt-4 border-t">
            <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                disabled={busy}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
                <button
                    onClick={onSupply}
                    disabled={busy || !amount}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {isSupplying ? 'Supplying…' : 'Supply'}
                </button>
                <button
                    onClick={onBorrow}
                    disabled={busy || !amount}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {isBorrowing ? 'Borrowing…' : 'Borrow'}
                </button>
            </div>
            <button
                onClick={onRepay}
                disabled={busy}
                className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
                {isRepaying ? 'Repaying…' : 'Repay (principal + accrued interest)'}
            </button>
            {error && (
                <p className="text-xs text-red-500 font-mono break-all">{error}</p>
            )}
        </div>
    )
}
