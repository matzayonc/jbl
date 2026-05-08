import { queryClient } from "@/config/queryClient";
import { SolanaProvider } from "@solana/react-hooks";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { solanaClient } from "./config/solana";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider client={solanaClient}>{children}</SolanaProvider>
    </QueryClientProvider>
  );
}
