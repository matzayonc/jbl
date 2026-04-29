import React from 'react'
import { SolanaProvider } from '@solana/react-hooks'
import { solanaClient } from './config/solana'

export function Providers({ children }: { children: React.ReactNode }) {
    return <SolanaProvider client={solanaClient}>{children}</SolanaProvider>
}
