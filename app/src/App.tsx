import { WalletButton } from './components/WalletButton'
import { LendingInfoCard } from './components/lending/LendingInfoCard'

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-white p-8 dark:bg-gray-950">
      <h1 className="text-5xl font-semibold tracking-tight text-pink-500">JBL</h1>
      <WalletButton />
      <LendingInfoCard />
    </main>
  )
}

export default App
