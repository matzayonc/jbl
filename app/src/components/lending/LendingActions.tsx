import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

interface Props {
    amount: string
    onAmountChange: (value: string) => void
    onSupply: () => void
    onBorrow: () => void
    onRepay: () => void
    onWithdraw: () => void
    onTakeLp: () => void
    isSupplying: boolean
    isBorrowing: boolean
    isRepaying: boolean
    isWithdrawing: boolean
    error: string | null
}

export function LendingActions({
    amount,
    onAmountChange,
    onSupply,
    onBorrow,
    onRepay,
    onWithdraw,
    onTakeLp,
    isSupplying,
    isBorrowing,
    isRepaying,
    isWithdrawing,
    error,
}: Props) {
    const busy = isSupplying || isBorrowing || isRepaying || isWithdrawing

    const amountInput = (accentColor: string) => (
        <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={busy}
            className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 ${accentColor}`}
        />
    )

    return (
        <div className="pt-4 border-t">
            <Tabs defaultValue="lend">
                <TabsList className="w-full">
                    <TabsTrigger value="lend" className="flex-1">Lend</TabsTrigger>
                    <TabsTrigger value="borrow" className="flex-1">Borrow</TabsTrigger>
                    <TabsTrigger value="lp" className="flex-1">LP Tokens</TabsTrigger>
                </TabsList>

                <TabsContent value="lend" className="space-y-3 mt-3">
                    {amountInput('focus:ring-green-500')}
                    <div className="flex gap-2">
                        <Button
                            onClick={onSupply}
                            disabled={busy || !amount}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSupplying ? 'Supplying…' : 'Supply'}
                        </Button>
                        <Button
                            onClick={onWithdraw}
                            disabled={busy || !amount}
                            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
                        >
                            {isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="borrow" className="space-y-3 mt-3">
                    {amountInput('focus:ring-blue-500')}
                    <div className="flex gap-2">
                        <Button
                            onClick={onBorrow}
                            disabled={busy || !amount}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isBorrowing ? 'Borrowing…' : 'Borrow'}
                        </Button>
                        <Button
                            onClick={onRepay}
                            disabled={busy || !amount}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {isRepaying ? 'Repaying…' : 'Repay'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="lp" className="space-y-3 mt-3">
                    <p className="text-xs text-muted-foreground">
                        Claim your owed LP tokens. Enter the amount of LP tokens to take.
                    </p>
                    {amountInput('focus:ring-purple-500')}
                    <Button
                        onClick={onTakeLp}
                        disabled={busy || !amount}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        Take LP Tokens
                    </Button>
                </TabsContent>
            </Tabs>

            {error && (
                <p className="text-xs text-red-500 font-mono break-all mt-2">{error}</p>
            )}
        </div>
    )
}
