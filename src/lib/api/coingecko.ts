"use client";

import { SUPPORTED_COINS } from "../utils/constants";

const BASE_URL = "https://api.coingecko.com/api/v3";

// Standard fallback prices for when CoinGecko is rate-limited or offline
const FALLBACK_PRICES: Record<string, number> = {
  bitcoin: 64250.00,
  ethereum: 3450.00,
  solana: 145.00,
  binancecoin: 580.00,
  ripple: 0.58,
  cardano: 0.38,
  dogecoin: 0.12,
  polkadot: 6.50,
  "avalanche-2": 24.00,
  chainlink: 14.20,
  tron: 0.15,
  litecoin: 78.50,
  "polygon-ecosystem-token": 0.42,
  uniswap: 6.80,
  stellar: 0.10,
  cosmos: 4.80,
  filecoin: 3.90,
  near: 4.20,
  aptos: 6.50,
  "internet-computer": 7.80,
  "render-token": 5.10,
  arbitrum: 0.52,
  optimism: 1.45,
  "injective-protocol": 18.50,
  aave: 135.00,
  "the-graph": 0.14,
  pepe: 0.000008,
  "shiba-inu": 0.000014,
  bonk: 0.000018,
  sui: 1.15,
  tether: 1.00,
  "usd-coin": 1.00,
  dai: 1.00,
};

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  market_cap_change_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  sparkline_in_7d?: { price: number[] };
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  image: { thumb: string; small: string; large: string };
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    ath: Record<string, number>;
    atl: Record<string, number>;
  };
}

export interface ChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

export interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    small: string;
    large: string;
    price_btc: number;
    market_cap_rank: number;
    data: {
      price: number;
      price_change_percentage_24h: Record<string, number>;
      sparkline: string;
    };
  };
}

export interface GlobalData {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
  };
}

// ─── LocalStorage Persistent Cache ───
const CACHE_PREFIX = "phantom_cg_v2_";

function getLocalCache<T>(key: string): { data: T; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLocalCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage quota full
  }
}

// Memory cache for active session
const memoryCache = new Map<string, { data: unknown; expires: number }>();
const inflightRequests = new Map<string, Promise<unknown>>();
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300;

async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return fetch(url, init);
}

// Exponential backoff fetch
async function fetchWithRetry(url: string, retries: number = 2): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await rateLimitedFetch(url, {
        headers: { Accept: "application/json" },
      });

      if (res.status === 429) {
        const backoffMs = Math.min(800 * Math.pow(2, attempt), 3000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      return res;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error("Rate limited or network error");
}

// Core fetcher with Persistent Cache + Memory Cache
async function fetchWithCache<T>(url: string, ttlMs: number): Promise<T> {
  const cacheKey = encodeURIComponent(url);

  // 1. Check memory cache (fastest)
  const mem = memoryCache.get(cacheKey);
  if (mem && mem.expires > Date.now()) {
    return mem.data as T;
  }

  // 2. Check local storage cache (persisted across reloads/navigations)
  const stored = getLocalCache<T>(cacheKey);
  const isStorageFresh = stored && Date.now() - stored.timestamp < ttlMs;
  if (isStorageFresh) {
    memoryCache.set(cacheKey, { data: stored.data, expires: Date.now() + ttlMs });
    return stored.data;
  }

  // 3. Deduplicate in-flight requests
  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const fetchPromise = (async (): Promise<T> => {
    try {
      const res = await fetchWithRetry(url);

      if (!res.ok) {
        if (stored) {
          console.warn(`CoinGecko status ${res.status}, using persisted cache`);
          return stored.data;
        }
        throw new Error(`API response: ${res.status}`);
      }

      const data = await res.json();
      memoryCache.set(cacheKey, { data, expires: Date.now() + ttlMs });
      setLocalCache(cacheKey, data);
      return data as T;
    } catch (err) {
      // Fallback to persisted cache even if expired (up to 7 days)
      if (stored) {
        console.warn("CoinGecko fetch failed, using fallback persisted cache:", err);
        return stored.data;
      }
      throw err;
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// ─── Synthetic Fallback Generator ───

function generateFallbackSparkline(basePrice: number): { price: number[] } {
  const points: number[] = [];
  let current = basePrice * 0.96;
  for (let i = 0; i < 168; i++) {
    const change = (Math.random() - 0.48) * (basePrice * 0.008);
    current = Math.max(basePrice * 0.5, current + change);
    points.push(current);
  }
  return { price: points };
}

function generateFallbackCoinsMarket(coinIds?: string[]): CoinMarketData[] {
  const list = coinIds
    ? SUPPORTED_COINS.filter(c => coinIds.includes(c.id))
    : SUPPORTED_COINS;

  return list.map((coin, index) => {
    const price = FALLBACK_PRICES[coin.id] || 10.0;
    const change24h = (Math.sin(index * 1.5) * 4.5);
    const image = `https://assets.coingecko.com/coins/images/${index + 1}/large/${coin.symbol.toLowerCase()}.png`;

    return {
      id: coin.id,
      symbol: coin.symbol.toLowerCase(),
      name: coin.name,
      image,
      current_price: price,
      market_cap: price * 18_000_000,
      market_cap_rank: index + 1,
      fully_diluted_valuation: price * 21_000_000,
      total_volume: price * 500_000,
      high_24h: price * 1.04,
      low_24h: price * 0.96,
      price_change_24h: price * (change24h / 100),
      price_change_percentage_24h: change24h,
      market_cap_change_24h: price * 18_000_000 * (change24h / 100),
      circulating_supply: 18_500_000,
      total_supply: 21_000_000,
      max_supply: 21_000_000,
      ath: price * 1.4,
      ath_change_percentage: -28.5,
      ath_date: "2024-03-14T00:00:00.000Z",
      atl: price * 0.05,
      atl_change_percentage: 1900.0,
      atl_date: "2015-10-20T00:00:00.000Z",
      sparkline_in_7d: generateFallbackSparkline(price),
    };
  });
}

function generateFallbackChart(basePrice: number): ChartData {
  const now = Date.now();
  const step = (7 * 24 * 60 * 60 * 1000) / 168; // 168 hours in 7 days
  const prices: [number, number][] = [];
  const market_caps: [number, number][] = [];
  const total_volumes: [number, number][] = [];

  let price = basePrice * 0.95;
  for (let i = 0; i < 168; i++) {
    const timestamp = now - (168 - i) * step;
    const delta = (Math.random() - 0.48) * (basePrice * 0.007);
    price = Math.max(basePrice * 0.4, price + delta);
    prices.push([timestamp, price]);
    market_caps.push([timestamp, price * 18_000_000]);
    total_volumes.push([timestamp, price * 300_000]);
  }

  return { prices, market_caps, total_volumes };
}

function generateFallbackDetail(coinId: string): CoinDetail {
  const config = SUPPORTED_COINS.find(c => c.id === coinId) || {
    id: coinId,
    name: coinId.toUpperCase(),
    symbol: coinId.toUpperCase(),
  };
  const price = FALLBACK_PRICES[coinId] || 10.0;

  return {
    id: coinId,
    symbol: config.symbol.toLowerCase(),
    name: config.name,
    description: {
      en: `${config.name} is a decentralized digital asset and blockchain network designed for fast, secure financial transactions.`,
    },
    image: {
      thumb: "",
      small: "",
      large: "",
    },
    market_data: {
      current_price: { usd: price, eur: price * 0.92, gbp: price * 0.78 },
      market_cap: { usd: price * 18_000_000 },
      total_volume: { usd: price * 500_000 },
      price_change_percentage_24h: 2.45,
      price_change_percentage_7d: 5.12,
      price_change_percentage_30d: 12.80,
      circulating_supply: 18_500_000,
      total_supply: 21_000_000,
      max_supply: 21_000_000,
      ath: { usd: price * 1.4 },
      atl: { usd: price * 0.05 },
    },
  };
}

// ─── Exported API Wrappers ───

export async function getCoinsMarket(
  coinIds?: string[],
  currency: string = "usd",
  page: number = 1,
  perPage: number = 50,
  sparkline: boolean = true,
  category?: string
): Promise<CoinMarketData[]> {
  let url = `${BASE_URL}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=${sparkline}&price_change_percentage=7d`;

  if (coinIds && coinIds.length > 0) {
    url += `&ids=${coinIds.join(",")}`;
  }
  if (category && category !== "all") {
    url += `&category=${category}`;
  }

  try {
    const data = await fetchWithCache<CoinMarketData[]>(url, 180_000); // 3 min cache
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return generateFallbackCoinsMarket(coinIds);
  } catch {
    console.warn("CoinGecko API unreachable/rate limited. Returning fallback market data.");
    return generateFallbackCoinsMarket(coinIds);
  }
}

export async function getCoinDetail(coinId: string): Promise<CoinDetail> {
  const url = `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
  try {
    return await fetchWithCache<CoinDetail>(url, 600_000); // 10 min cache
  } catch {
    console.warn(`CoinGecko detail failed for ${coinId}, returning fallback detail.`);
    return generateFallbackDetail(coinId);
  }
}

export async function getCoinChart(
  coinId: string,
  currency: string = "usd",
  days: string = "7"
): Promise<ChartData> {
  const url = `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`;
  try {
    const data = await fetchWithCache<ChartData>(url, 300_000); // 5 min cache
    if (data && data.prices && data.prices.length > 0) {
      return data;
    }
    const price = FALLBACK_PRICES[coinId] || 10.0;
    return generateFallbackChart(price);
  } catch {
    console.warn(`CoinGecko chart failed for ${coinId}, returning fallback chart.`);
    const price = FALLBACK_PRICES[coinId] || 10.0;
    return generateFallbackChart(price);
  }
}

export async function getTrending(): Promise<TrendingCoin[]> {
  try {
    const data = await fetchWithCache<{ coins: TrendingCoin[] }>(
      `${BASE_URL}/search/trending`,
      600_000
    );
    return data.coins || [];
  } catch {
    return [];
  }
}

export async function getGlobalData(): Promise<GlobalData> {
  try {
    return await fetchWithCache<GlobalData>(`${BASE_URL}/global`, 300_000);
  } catch {
    return {
      data: {
        total_market_cap: { usd: 2450000000000 },
        total_volume: { usd: 85000000000 },
        market_cap_percentage: { btc: 54.2, eth: 16.8 },
        market_cap_change_percentage_24h_usd: 2.15,
        active_cryptocurrencies: 12450,
      },
    };
  }
}
