import { autoDiscover, createClient } from '@solana/client'

export const endpoint =
    import.meta.env.VITE_SOLANA_RPC_URL ?? 'http://localhost:8899'

export const websocketEndpoint =
    import.meta.env.VITE_SOLANA_WS_URL ??
    endpoint.replace('https://', 'wss://').replace('http://', 'ws://')

export const solanaClient = createClient({
    endpoint,
    websocketEndpoint,
    walletConnectors: autoDiscover(),
})
