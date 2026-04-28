import { Buffer } from 'buffer'
import { useMemo, useState } from 'react'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { program as readOnlyProgram } from '../lib/program'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import * as anchor from '@anchor-lang/core'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card'
import { useLendingAccounts } from '../hooks/useLendingAccounts'
import { CreateLendingAccountForm } from './CreateLendingAccountForm'
import { useAnchorProgram } from '../hooks/useAnchorWallet'

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
  const { wallet } = useWalletConnection()
  const { accounts, loading, refetch } = useLendingAccounts()
  const program = useAnchorProgram()

  const [supplyAmount, setSupplyAmount] = useState('')
  const [isSupplying, setIsSupplying] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  const userPublicKey = useMemo(() => {
    return wallet?.account.publicKey ? new PublicKey(wallet.account.publicKey) : null
  }, [wallet])

  const userAccount = useMemo(() => {
    if (!userPublicKey || !accounts.length) return null
    return accounts.find(acc => acc.authority.toBase58() === userPublicKey.toBase58()) || null
  }, [accounts, userPublicKey])

  const handleSupply = async () => {
    if (!program || !userAccount || !userPublicKey || !supplyAmount) return

    setIsSupplying(true)
    setTxError(null)

    try {
      const amount = new anchor.BN(parseFloat(supplyAmount) * 1_000_000)
      const userTokenAccount = getAssociatedTokenAddressSync(userAccount.mint, userPublicKey)

      const programId = readOnlyProgram.programId

      const [lendingVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('lending_vault'), userAccount.publicKey.toBuffer()],
        programId
      )

      const [depositReceipt] = PublicKey.findProgramAddressSync(
        [Buffer.from('deposit_receipt'), userAccount.publicKey.toBuffer(), userPublicKey.toBuffer()],
        programId
      )

      const tx = await program.methods
        .deposit(amount)
        .accounts({
          lendingAccount: userAccount.publicKey,
          mint: userAccount.mint,
          authority: userPublicKey,
          userTokenAccount,
          lendingVault,
          depositReceipt,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      console.log('Supply transaction successful:', tx)
      setSupplyAmount('')
      refetch()
    } catch (err) {
      console.error('Supply failed:', err)
      setTxError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSupplying(false)
    }
  }

  const lendingData = useMemo((): LendingData => {
    if (loading || !accounts.length) {
      return {
        totalSupply: 0,
        totalBorrowed: 0,
        supplyApy: 0,
        borrowApy: 0,
        utilizationRate: 0,
        availableLiquidity: 0,
        userDeposits: 0,
        userBorrows: 0,
      }
    }

    const DECIMALS = 1_000_000 // Assuming 6 decimals for now

    let totalSupply = 0
    let totalBorrowed = 0
    let userDeposits = 0
    let userBorrows = 0

    accounts.forEach((acc) => {
      const dep = Number(acc.totalDeposited) / DECIMALS
      const bor = Number(acc.totalBorrowed) / DECIMALS

      totalSupply += dep
      totalBorrowed += bor

      if (userPublicKey && acc.authority.toBase58() === userPublicKey.toBase58()) {
        userDeposits += dep
        userBorrows += bor
      }
    })

    const utilizationRate = totalSupply > 0 ? (totalBorrowed / totalSupply) * 100 : 0
    const availableLiquidity = totalSupply - totalBorrowed

    return {
      totalSupply,
      totalBorrowed,
      supplyApy: 5.2, // Mocked for now as program doesn't have APY logic
      borrowApy: 8.4, // Mocked for now
      utilizationRate,
      availableLiquidity,
      userDeposits,
      userBorrows,
    }
  }, [accounts, loading, userPublicKey])

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

  if (loading) {
    return (
      <div className="w-full max-w-2xl p-12 flex justify-center items-center text-muted-foreground font-medium animate-pulse">
        Loading protocol statistics...
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <Card className="w-full max-w-2xl border-pink-200">
        <CardHeader>
          <CardTitle>No Pools Found</CardTitle>
          <CardDescription>
            There are currently no active lending pools on this cluster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateLendingAccountForm onCreated={() => refetch()} />
        </CardContent>
      </Card>
    )
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
        <div className="space-y-4 pt-4 border-t">
          {userAccount ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount to supply"
                  value={supplyAmount}
                  onChange={(e) => setSupplyAmount(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  disabled={isSupplying}
                />
                <button
                  onClick={handleSupply}
                  disabled={isSupplying || !supplyAmount}
                  className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSupplying ? 'Supplying...' : 'Supply'}
                </button>
              </div>
              {txError && (
                <p className="text-xs text-red-500 font-mono break-all">{txError}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Create your own lending pool above to start supplying tokens.
            </p>
          )}

          <div className="flex gap-4">
            <button className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors opacity-50 cursor-not-allowed" disabled>
              Borrow
            </button>
            <button className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors opacity-50 cursor-not-allowed" disabled>
              Withdraw
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
