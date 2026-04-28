import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { program } from "../lib/program";

export interface LendingAccountData {
    publicKey: PublicKey;
    authority: PublicKey;
    mint: PublicKey;
    lpMint: PublicKey;
    totalDeposited: bigint;
    totalBorrowed: bigint;
    totalLpIssued: bigint;
    lastUpdateSlot: bigint;
    bump: number;
    lpMintBump: number;
}

interface UseLendingAccountsResult {
    accounts: LendingAccountData[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useLendingAccounts(): UseLendingAccountsResult {
    const [accounts, setAccounts] = useState<LendingAccountData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchCount, setFetchCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function fetchAccounts() {
            setLoading(true);
            setError(null);
            try {
                // Mirror the test: program.account.lendingAccount.all()
                const all = await program.account.lendingAccount.all();
                console.log("Fetched lending accounts:", all);
                if (!cancelled) {
                    setAccounts(
                        all.map(({ publicKey, account }) => ({
                            publicKey,
                            authority: account.authority,
                            mint: account.mint,
                            lpMint: account.lpMint,
                            totalDeposited: BigInt(account.totalDeposited.toString()),
                            totalBorrowed: BigInt(account.totalBorrowed.toString()),
                            totalLpIssued: BigInt(account.totalLpIssued.toString()),
                            lastUpdateSlot: BigInt(account.lastUpdateSlot.toString()),
                            bump: account.bump,
                            lpMintBump: account.lpMintBump,
                        }))
                    );
                }
            } catch (err) {
                console.error("Error fetching lending accounts:", err);
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        console.log("Starting fetch of all lending accounts");
        fetchAccounts();
        console.log("After fetchAccounts call");

        return () => {
            cancelled = true;
        };
    }, [fetchCount]);

    return {
        accounts,
        loading,
        error,
        refetch: () => setFetchCount((n) => n + 1),
    };
}

/** Fetch a single lending account by authority + mint (mirrors PDA derivation in tests) */
export function useLendingAccount(
    authority: PublicKey | null,
    mint: PublicKey | null
): { account: LendingAccountData | null; loading: boolean; error: string | null } {
    const [account, setAccount] = useState<LendingAccountData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authority || !mint) return;
        let cancelled = false;
        console.log("Starting fetch");

        async function fetchAccount() {
            setLoading(true);
            setError(null);
            try {
                console.log("Starting fetch");

                const [pda] = PublicKey.findProgramAddressSync(
                    [new TextEncoder().encode("lending"), authority!.toBytes(), mint!.toBytes()],
                    program.programId
                );
                const data = await program.account.lendingAccount.fetch(pda);
                console.log("Fetched lending account data:", data);
                if (!cancelled) {
                    setAccount({
                        publicKey: pda,
                        authority: data.authority,
                        mint: data.mint,
                        lpMint: data.lpMint,
                        totalDeposited: BigInt(data.totalDeposited.toString()),
                        totalBorrowed: BigInt(data.totalBorrowed.toString()),
                        totalLpIssued: BigInt(data.totalLpIssued.toString()),
                        lastUpdateSlot: BigInt(data.lastUpdateSlot.toString()),
                        bump: data.bump,
                        lpMintBump: data.lpMintBump,
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchAccount();
        return () => {
            cancelled = true;
        };
    }, [authority?.toBase58(), mint?.toBase58()]);

    return { account, loading, error };
}
