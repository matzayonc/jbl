export interface LendingData {
    totalSupply: number
    totalBorrowed: number
    supplyApy: number
    borrowApy: number
    utilizationRate: number
    availableLiquidity: number
    userDeposits: number
    userBorrows: number
}

export const TOKEN_DECIMALS = 1_000_000

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function formatPercentage(rate: number): string {
    return `${rate.toFixed(2)}%`
}
