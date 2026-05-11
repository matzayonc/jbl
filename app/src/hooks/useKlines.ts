import { fetchPerpsKlines, type KlineInterval } from '@/api/binance.api'
import { queryKeys } from '@/lib/queryKeys'
import { useQuery } from '@tanstack/react-query'
import type { CandlestickData, Time, UTCTimestamp } from 'lightweight-charts'

/**
 * Fetches Binance USD-M perpetual futures klines and converts them into the
 * lightweight-charts `CandlestickData` format ready for direct chart consumption.
 *
 * Caching strategy (anti-rate-limit / anti-refetch):
 *   • staleTime: Infinity  → data is always considered fresh; no background refetch.
 *   • gcTime: 30 min       → keep in the React Query cache between navigations.
 *   • refetchOnWindowFocus / Mount / Reconnect: false  → zero extra network calls.
 *   • retry: 1             → one retry on transient failure, then surface the error
 *                            so the chart can fall back to mock data.
 *
 * When `binancePerp` is undefined the query is disabled and `data` stays undefined;
 * the chart component handles the fallback transparently.
 */
export function useKlines(
    binancePerp: string | undefined,
    interval: KlineInterval = '1d',
    limit = 900,
) {
    return useQuery({
        queryKey: queryKeys.klines.perp(binancePerp ?? '', interval),
        queryFn: async (): Promise<CandlestickData<Time>[]> => {
            console.log(`Fetching klines for ${binancePerp} at interval ${interval} with limit ${limit}`)
            const raw = await fetchPerpsKlines(binancePerp!, interval, limit)
            return raw.map((k) => ({
                // lightweight-charts expects Unix seconds (UTCTimestamp).
                time: Math.floor(k.openTime / 1_000) as UTCTimestamp,
                open:  k.open,
                high:  k.high,
                low:   k.low,
                close: k.close,
            }))
        },
        enabled: !!binancePerp,
        // ── Cache / staleness ────────────────────────────────────────────────
        staleTime:             Infinity,   // never re-fetch in background
        gcTime:                30 * 60_000, // 30 min in-memory retention
        // ── Refetch guards ───────────────────────────────────────────────────
        refetchOnWindowFocus:  false,
        refetchOnMount:        false,
        refetchOnReconnect:    false,
        // ── Error handling ───────────────────────────────────────────────────
        retry: 1,
    })
}
