import { useMemo, useState } from 'react'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import * as anchor from '@anchor-lang/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useLendingAccounts } from '../../hooks/useLendingAccounts'
import { useAnchorProgram } from '../../hooks/useAnchorProgram'
import { CreateLendingAccountForm } from '../CreateLendingAccountForm'
import { LendingStats } from './LendingStats'
import { LendingPositions } from './LendingPositions'
import { LendingActions } from './LendingActions'
import { TOKEN_DECIMALS, type LendingData } from './types'

export function LendingInfoCard() {
    const { wallet } = useWalletConnection()
    const { accounts, loading, refetch } = useLendingAccounts()
    const program = useAnchorProgram()

    const [amount, setAmount] = useState('')
    const [isSupplying, setIsSupplying] = useState(false)
    const [isBorrowing, setIsBorrowing] = useState(false)
    const [isRepaying, setIsRepaying] = useState(false)
    const [txError, setTxError] = useState<string | null>(null)

    const userPublicKey = useMemo(
        () => (wallet?.account.publicKey ? new PublicKey(wallet.account.publicKey) : null),
        [wallet],
    )

    const userAccount = useMemo(() => {
        if (!userPublicKey || !accounts.length) return null
        return accounts.find((acc) => acc.authority.toBase58() === userPublicKey.toBase58()) ?? null
    }, [accounts, userPublicKey])

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

        let totalSupply = 0
        let totalBorrowed = 0
        let userDeposits = 0
        let userBorrows = 0

        for (const acc of accounts) {
            const dep = Number(acc.totalDeposited) / TOKEN_DECIMALS
            const bor = Number(acc.totalBorrowed) / TOKEN_DECIMALS
            totalSupply += dep
            totalBorrowed += bor
            if (userPublicKey && acc.authority.toBase58() === userPublicKey.toBase58()) {
                userDeposits += dep
                userBorrows += bor
            }
        }

        const utilizationRate = totalSupply > 0 ? (totalBorrowed / totalSupply) * 100 : 0

        // Derive APYs from on-chain borrow_fee_bps
        // borrowApy: annualized rate = fee_bps / 100 (e.g. 50 bps = 0.5%)
        // supplyApy: lenders earn borrowApy scaled by utilization
        const avgFeeBps = accounts.length > 0
            ? accounts.reduce((sum, acc) => sum + acc.borrowFeeBps, 0) / accounts.length
            : 0
        const borrowApy = avgFeeBps / 100
        const supplyApy = borrowApy * (utilizationRate / 100)

        return {
            totalSupply,
            totalBorrowed,
            supplyApy,
            borrowApy,
            utilizationRate,
            availableLiquidity: totalSupply - totalBorrowed,
            userDeposits,
            userBorrows,
        }
    }, [accounts, loading, userPublicKey])

    async function handleSupply() {
        if (!program || !userAccount || !userPublicKey || !amount) return
        setIsSupplying(true)
        setTxError(null)
        try {
            const lamports = new anchor.BN(parseFloat(amount) * TOKEN_DECIMALS)
            const userTokenAccount = getAssociatedTokenAddressSync(userAccount.mint, userPublicKey)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tx = await program.methods.deposit(lamports).accounts({ mint: userAccount.mint, userTokenAccount } as any).rpc()
            console.log('Supply tx:', tx)
            setAmount('')
            refetch()
        } catch (err) {
            setTxError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsSupplying(false)
        }
    }

    async function handleBorrow() {
        if (!program || !userAccount || !userPublicKey || !amount) return
        setIsBorrowing(true)
        setTxError(null)
        try {
            const lamports = new anchor.BN(parseFloat(amount) * TOKEN_DECIMALS)
            const userTokenAccount = getAssociatedTokenAddressSync(userAccount.mint, userPublicKey)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tx = await program.methods.borrow(lamports).accounts({ mint: userAccount.mint, userTokenAccount } as any).rpc()
            console.log('Borrow tx:', tx)
            setAmount('')
            refetch()
        } catch (err) {
            setTxError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsBorrowing(false)
        }
    }

    async function handleRepay() {
        if (!program || !userAccount || !userPublicKey) return
        setIsRepaying(true)
        setTxError(null)
        try {
            const userTokenAccount = getAssociatedTokenAddressSync(userAccount.mint, userPublicKey)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lamports = new anchor.BN(parseFloat(amount || '0') * TOKEN_DECIMALS)
            const tx = await program.methods.repay(lamports).accounts({ mint: userAccount.mint, userTokenAccount } as any).rpc()
            console.log('Repay tx:', tx)
            refetch()
        } catch (err) {
            setTxError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsRepaying(false)
        }
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
                    <CreateLendingAccountForm onCreated={refetch} />
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
                <CardDescription>Current lending pool statistics and your positions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <LendingStats data={lendingData} />
                <LendingPositions data={lendingData} />
                {userAccount ? (
                    <LendingActions
                        amount={amount}
                        onAmountChange={setAmount}
                        onSupply={handleSupply}
                        onBorrow={handleBorrow}
                        onRepay={handleRepay}
                        isSupplying={isSupplying}
                        isBorrowing={isBorrowing}
                        isRepaying={isRepaying}
                        error={txError}
                    />
                ) : (
                    <p className="text-sm text-muted-foreground italic pt-4 border-t">
                        Create your own lending pool above to start supplying tokens.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
