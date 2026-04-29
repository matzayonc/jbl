import { formatCurrency, type LendingData } from './types'

interface Props {
    data: Pick<LendingData, 'userDeposits' | 'userBorrows'>
}

export function LendingPositions({ data }: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Positions</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Your Deposits</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(data.userDeposits)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Your Borrows</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(data.userBorrows)}</p>
                </div>
            </div>
        </div>
    )
}
