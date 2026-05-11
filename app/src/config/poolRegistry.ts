import type { Category } from '@/types/pool'

/** Default icon shown when no token metadata is available. */
export const USDC_ICON = 'https://wsrv.nl/?w=64&h=64&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v%2Flogo.png&dpr=2&quality=80'
export const USDT_ICON = "https://wsrv.nl/?w=64&h=64&url=https%3A%2F%2Fraw.githubusercontent.com%2Fsolana-labs%2Ftoken-list%2Fmain%2Fassets%2Fmainnet%2FEs9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB%2Flogo.svg&dpr=2&quality=80"

/** Static metadata for a pool, keyed by the pool's on-chain address. */
export interface PoolMeta {
    name: string
    symbol: string
    icon: string
    collateralSymbol: string
    collateralIcon: string
    lendSymbol: string
    lendIcon: string
    category: Category
}

const POOL_REGISTRY: Record<string, PoolMeta> = {
    // ── Default / first entry ────────────────────────────────────────────────
    // Used as fallback when a pool address is not found in the registry.
    'DEFAULT': {
        name: 'Tether USD',
        symbol: 'USDT',
        icon: USDT_ICON,
        collateralSymbol: 'USDC',
        collateralIcon: USDC_ICON,
        lendSymbol: 'USDT',
        lendIcon: USDT_ICON,
        category: 'stablecoin',
    },
    'Fb4DxpMYFgdTB4FXq6o3Z2BGKh98zbQqkZH7iFXP1gdG': {
        name: 'Tesla',
        symbol: 'TSLAx',
        icon: "https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FTSLAx.png&dpr=2&quality=80",
        collateralSymbol: 'USDT',
        collateralIcon: USDT_ICON,
        lendSymbol: 'TSLAx',
        lendIcon: "https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FTSLAx.png&dpr=2&quality=80",
        category:   'volatile',
    },
    'Gg5Zy7n1sHjLh3mLh9e2qj8X9v1Z5o6a7b8c9d0e1f2g': {
        name: 'Nvidia',
        symbol: 'NVDAx',
        icon: "https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FNVDAx.png&dpr=2&quality=80",
        collateralSymbol: 'USDC',
        collateralIcon: USDC_ICON,
        lendSymbol: 'NVDAx',
        lendIcon: "https://wsrv.nl/?w=32&h=32&url=https%3A%2F%2Fxstocks-metadata.backed.fi%2Flogos%2Ftokens%2FNVDAx.png&dpr=2&quality=80",
        category:   'volatile',
    }
} 

/** The fallback metadata returned for any unrecognised pool address. */
const DEFAULT_POOL_META: PoolMeta = POOL_REGISTRY.DEFAULT

/**
 * Look up display metadata for the given pool address.
 * Falls back to the default (USDT/USDC) entry if the address is not registered.
 */
export function getPoolMeta(address: string): PoolMeta {
    return POOL_REGISTRY[address] || DEFAULT_POOL_META
}
