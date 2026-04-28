import { useWalletConnection } from '@solana/react-hooks'

function WalletButton() {
  const { connected, connecting, connectors, connect, disconnect, wallet } =
    useWalletConnection()

  if (connected && wallet) {
    const addr = String(wallet.account.address)
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-sm text-gray-500">
          {addr.slice(0, 4)}…{addr.slice(-4)}
        </p>
        <button
          onClick={() => disconnect()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {connectors.map((c) => (
        <button
          key={c.id}
          onClick={() => connect(c.id)}
          disabled={connecting}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {connecting ? 'Connecting…' : `Connect ${c.name}`}
        </button>
      ))}
      {connectors.length === 0 && (
        <p className="text-sm text-gray-400">No wallets detected</p>
      )}
    </div>
  )
}

function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-white p-8 dark:bg-gray-950">
      <h1 className="text-5xl font-semibold tracking-tight text-pink-500">JBL</h1>
      <WalletButton />
    </main>
  )
}

export default App
