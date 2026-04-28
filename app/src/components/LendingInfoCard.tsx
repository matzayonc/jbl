import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface LendingData {
  totalSupply: number
  totalBorrowed: number
  supplyApy: number
  borrowApy: number
  utilizationRate: number
  availableLiquidity: number
  userDeposits: number
  userBorrows: number
}

export function LendingInfoCard() {
  // Initialize all data with 42 as placeholder values
  const lendingData: LendingData = {
    totalSupply: 42,
    totalBorrowed: 42,
    supplyApy: 42,
    borrowApy: 42,
    utilizationRate: 42,
    availableLiquidity: 42,
    userDeposits: 42,
    userBorrows: 42,
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🏦</span>
          Lending Protocol Info
        </CardTitle>
        <CardDescription>
          Current lending pool statistics and your positions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Protocol Statistics */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Protocol Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Supply</p>
              <p className="text-xl font-bold">{formatCurrency(lendingData.totalSupply)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Borrowed</p>
              <p className="text-xl font-bold">{formatCurrency(lendingData.totalBorrowed)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Supply APY</p>
              <p className="text-xl font-bold text-green-600">{formatPercentage(lendingData.supplyApy)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Borrow APY</p>
              <p className="text-xl font-bold text-red-600">{formatPercentage(lendingData.borrowApy)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Utilization Rate</p>
              <p className="text-xl font-bold">{formatPercentage(lendingData.utilizationRate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Available Liquidity</p>
              <p className="text-xl font-bold">{formatCurrency(lendingData.availableLiquidity)}</p>
            </div>
          </div>
        </div>

        {/* User Positions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Positions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Your Deposits</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(lendingData.userDeposits)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Your Borrows</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(lendingData.userBorrows)}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors">
            Supply
          </button>
          <button className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors">
            Borrow
          </button>
          <button className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors">
            Withdraw
          </button>
        </div>
      </CardContent>
    </Card>
  )
}