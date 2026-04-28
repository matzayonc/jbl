import './App.css'
import { useWalletConnection } from '@solana/react-hooks'

function WalletButton() {
  const { connected, connecting, connectors, connect, disconnect, wallet } =
    useWalletConnection()

  if (connected && wallet) {
    const addr = String(wallet.account.address)
    return (
      <div className="wallet-section">
        <p className="wallet-address">
          {addr.slice(0, 4)}…{addr.slice(-4)}
        </p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    )
  }

  return (
    <div className="wallet-section">
      {connectors.map((c) => (
        <button key={c.id} onClick={() => connect(c.id)} disabled={connecting}>
          {connecting ? 'Connecting…' : `Connect ${c.name}`}
        </button>
      ))}
      {connectors.length === 0 && <p>No wallets detected</p>}
    </div>
  )
}

function App() {
  return (
    <main>
      <h1>JBL</h1>
      <WalletButton />
    </main>
  )
}

export default App
