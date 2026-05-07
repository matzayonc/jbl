import { useMemo, useState } from 'react'
import { useWalletConnection } from '@solana/react-hooks'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import * as anchor from '@anchor-lang/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '../ui/empty'
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
    const [isWithdrawing, setIsWithdrawing] = useState(false)
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

        // Derive APYs from on-chain feeConfig
        // borrowApy: annualized rate = fee_bps / 100 (e.g. 50 bps = 0.5%)
        // supplyApy: lenders earn borrowApy scaled by utilization
        const feesBps = accounts.map((acc) => {
            const uBps = acc.totalDeposited > 0n
                ? Number((acc.totalBorrowed * 10000n) / acc.totalDeposited)
                : 0
            const { m1, c1, m2, c2 } = acc.feeConfig
            const y1 = (Number(m1) * uBps) / 10000 + Number(c1)
            const y2 = (Number(m2) * uBps) / 10000 + Number(c2)
            return Math.max(y1, y2)
        })

        const avgFeeBps = feesBps.length > 0
            ? feesBps.reduce((sum, fee) => sum + fee, 0) / feesBps.length
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

    const RPC_OPTS = { skipPreflight: true } as const
    const alreadyProcessed = (err: unknown) =>
        String(err).includes('already been processed')

    function derivePoolSigner(poolPubkey: PublicKey): PublicKey {
        const [poolSigner] = PublicKey.findProgramAddressSync(
            [Buffer.from('pool_signer'), poolPubkey.toBytes()],
            program!.programId,
        )
        return poolSigner
    }

    async function handleSupply() {
        if (!program || !userAccount || !userPublicKey || !amount) return
        setIsSupplying(true)
        setTxError(null)
        try {
            const lamports = new anchor.BN(parseFloat(amount) * TOKEN_DECIMALS)
            const userTokenAccount = getAssociatedTokenAddressSync(userAccount.mint, userPublicKey)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tx = await program.methods.deposit(lamports).accounts({ pool: userAccount.publicKey, mint: userAccount.mint, authority: userPublicKey, userTokenAccount } as any).rpc(RPC_OPTS)
            console.log('Supply tx:', tx)
            setAmount('')
            refetch()
        } catch (err) {
            if (alreadyProcessed(err)) { setAmount(''); refetch() }
            else setTxError(err instanceof Error ? err.message : String(err))
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
            const poolSigner = derivePoolSigner(userAccount.publicKey)
            const userTokenAccount = getAssociatedTokenAddressSync(userAccount.mint, userPublicKey)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tx = await program.methods.borrow(lamports).accounts({ pool: userAccount.publicKey, poolSigner, mint: userAccount.mint, authority: userPublicKey, userTokenAccount } as any).rpc(RPC_OPTS)
            console.log('Borrow tx:', tx)
            setAmount('')
            refetch()
        } catch (err) {
            if (alreadyProcessed(err)) { setAmount(''); refetch() }
            else setTxError(err instanceof Error ? err.message : String(err))
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
            const tx = await program.methods.repay(lamports).accounts({ pool: userAccount.publicKey, mint: userAccount.mint, authority: userPublicKey, userTokenAccount } as any).rpc(RPC_OPTS)
            console.log('Repay tx:', tx)
            setAmount('')
            refetch()
        } catch (err) {
            if (alreadyProcessed(err)) { setAmount(''); refetch() }
            else setTxError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsRepaying(false)
        }
    }

    async function handleWithdraw() {
        console.log('Attempting to withdraw', { amount, userAccount, userPublicKey })
        if (!program || !userAccount || !userPublicKey || !amount) return
        setIsWithdrawing(true)
        setTxError(null)
        try {
            const lamports = new anchor.BN(parseFloat(amount) * TOKEN_DECIMALS)
            const poolSigner = derivePoolSigner(userAccount.publicKey)
            const userTokenAccount = getAssociatedTokenAddressSync(userAccount.mint, userPublicKey)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tx = await program.methods.withdraw(lamports).accounts({ pool: userAccount.publicKey, poolSigner, mint: userAccount.mint, authority: userPublicKey, userTokenAccount } as any).rpc(RPC_OPTS)
            console.log('Withdraw tx:', tx)
            setAmount('')
            refetch()
        } catch (err) {
            console.error('Withdraw failed:', err)
            if (alreadyProcessed(err)) { setAmount(''); refetch() }
            else setTxError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsWithdrawing(false)
        }
    }

    async function handleTakeLp() {
        console.log('[takeLp] called', { program: !!program, userAccount, userPublicKey: userPublicKey?.toBase58(), amount })
        if (!program || !userAccount || !userPublicKey || !amount) return
        setTxError(null)
        try {
            const lamports = new anchor.BN(parseFloat(amount) * TOKEN_DECIMALS)
            console.log('[takeLp] methods available:', Object.keys(program.methods))
            console.log('[takeLp] takeLp method:', program.methods.takeLp)
            console.log('[takeLp] userAccount.lpMint:', userAccount.lpMint?.toBase58())
            const userLpTokenAccount = getAssociatedTokenAddressSync(userAccount.lpMint, userPublicKey)
            console.log('[takeLp] userLpTokenAccount:', userLpTokenAccount.toBase58())
            const built = program.methods.takeLp(lamports).accounts({ pool: userAccount.publicKey, mint: userAccount.mint, authority: userPublicKey, userLpTokenAccount } as any)
            console.log('[takeLp] instruction built, calling rpc...')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tx = await built.rpc(RPC_OPTS)
            console.log('TakeLp tx:', tx)
            setAmount('')
            refetch()
        } catch (err) {
            console.error('[takeLp] error:', err)
            if (alreadyProcessed(err)) { setAmount(''); refetch() }
            else setTxError(err instanceof Error ? err.message : String(err))
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
            <Empty className="w-full max-w-2xl border border-pink-200">
                <EmptyHeader>
                    <EmptyTitle>No Pools Found</EmptyTitle>
                    <EmptyDescription>
                        There are currently no active lending pools on this cluster.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <CreateLendingAccountForm onCreated={refetch} />
                </EmptyContent>
            </Empty>
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
                        onWithdraw={handleWithdraw}
                        onTakeLp={handleTakeLp}
                        isSupplying={isSupplying}
                        isBorrowing={isBorrowing}
                        isRepaying={isRepaying}
                        isWithdrawing={isWithdrawing}
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
