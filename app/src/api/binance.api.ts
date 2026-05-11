/**
 * Binance USD-M Perpetual Futures (FAPI) klines API.
 *
 * Docs: https://binance-docs.github.io/apidocs/futures/en/#kline-candlestick-data
 *
 * Rate limits: 2 400 request-weight per minute.  A klines call costs 1 weight,
 * so regular usage is well within the limit.  React Query's caching strategy
 * (staleTime: Infinity, refetchOnWindowFocus/Mount/Reconnect: false) ensures we
 * only hit the endpoint once per session per symbol.
 */

const FAPI_BASE = 'https://fapi.binance.com/fapi/v1'

/** Subset of Binance kline intervals used in this app. */
export type KlineInterval = '1d' | '4h' | '1h' | '15m'

/** Normalised OHLCV row returned to consumers. */
export interface BinanceKline {
    /** Open time – Unix timestamp in **milliseconds**. */
    openTime: number
    open: number
    high: number
    low: number
    close: number
    volume: number
}

/**
 * Fetch up to `limit` daily klines for a USD-M perpetual futures symbol.
 *
 * Throws on network failure or a non-2xx HTTP status so React Query can
 * surface the error and the chart component can fall back to mock data.
 */
export async function fetchPerpsKlines(
    symbol: string,
    interval: KlineInterval = '1d',
    limit = 900,
): Promise<BinanceKline[]> {
    // Binance does not accept arbitrary input – validate before building the URL.
    if (!/^[A-Z0-9]{1,20}$/.test(symbol)) {
        throw new Error(`Invalid Binance symbol: ${symbol}`)
    }

    const url = new URL(`${FAPI_BASE}/klines`)
    url.searchParams.set('symbol', symbol)
    url.searchParams.set('interval', interval)
    url.searchParams.set('limit', String(Math.min(limit, 1500))) // FAPI max

    const res = await fetch(url.toString(), {
        // Hard timeout so a stalled request never hangs the UI indefinitely.
        signal: AbortSignal.timeout(10_000),
        // No credentials or custom headers needed for public market data.
        headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
        throw new Error(`Binance FAPI ${res.status}: ${res.statusText}`)
    }

    // Raw shape: [ [openTime, open, high, low, close, volume, ...], ... ]
    const raw: unknown[][] = await res.json()

    return raw.map((k) => ({
        openTime: k[0] as number,
        open:     parseFloat(k[1] as string),
        high:     parseFloat(k[2] as string),
        low:      parseFloat(k[3] as string),
        close:    parseFloat(k[4] as string),
        volume:   parseFloat(k[5] as string),
    }))
}
