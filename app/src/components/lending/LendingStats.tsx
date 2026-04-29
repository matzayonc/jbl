import { formatCurrency, formatPercentage, type LendingData } from './types'

interface Props {
    data: LendingData
}

export function LendingStats({ data }: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Protocol Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
                <StatItem label="Total Supply" value={formatCurrency(data.totalSupply)} />
                <StatItem label="Total Borrowed" value={formatCurrency(data.totalBorrowed)} />
                <StatItem label="Supply APY" value={formatPercentage(data.supplyApy)} valueClass="text-green-600" />
                <StatItem label="Borrow APY" value={formatPercentage(data.borrowApy)} valueClass="text-red-600" />
                <StatItem label="Utilization Rate" value={formatPercentage(data.utilizationRate)} />
                <StatItem label="Available Liquidity" value={formatCurrency(data.availableLiquidity)} />
            </div>
        </div>
    )
}

function StatItem({
    label,
    value,
    valueClass = '',
}: {
    label: string
    value: string
    valueClass?: string
}) {
    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
        </div>
    )
}
