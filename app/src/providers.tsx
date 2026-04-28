import React from 'react';
import { SolanaProvider } from '@solana/react-hooks';
import { autoDiscover, createClient } from '@solana/client';

const endpoint =
    import.meta.env.VITE_SOLANA_RPC_URL ?? 'http://localhost:8899';

const websocketEndpoint =
    import.meta.env.VITE_SOLANA_WS_URL ??
    endpoint.replace('https://', 'wss://').replace('http://', 'ws://');

export const solanaClient = createClient({
    endpoint,
    websocketEndpoint,
    walletConnectors: autoDiscover(),
});

export function Providers({ children }: { children: React.ReactNode }) {
    return <SolanaProvider client={solanaClient}>{children}</SolanaProvider>;
}
