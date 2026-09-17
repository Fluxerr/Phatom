const BASE_URL = "https://api.coingecko.com/api/v3";

// ─── In-memory cache with stale-while-revalidate ───
const cache = new Map<string, { data: unknown; expires: number; staleAt: number }>();

// ─── Request deduplication ───
const inflightRequests = new Map<string, Promise<unknown>>();

// ─── Request queue to prevent rate limiting ───
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests

async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();
  return fetch(url, init);
}

// ─── Exponential backoff retry ───
async function fetchWithRetry(url: string, retries: number = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await rateLimitedFetch(url, {
        headers: { "Accept": "application/json" },
      });

      if (res.status === 429) {
        // Rate limited — wait and retry
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.warn(`CoinGecko rate limited (429). Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      return res;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      const backoffMs = Math.min(500 * Math.pow(2, attempt), 4000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error("Max retries exceeded");
}

// ─── Main fetch function with cache, dedup, retry, and stale fallback ───
async function fetchWithCache<T>(url: string, ttlMs: number): Promise<T> {
  const cached = cache.get(url);

  // Return fresh cache
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  // Deduplicate in-flight requests
  const inflight = inflightRequests.get(url);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const fetchPromise = (async (): Promise<T> => {
    try {
      const res = await fetchWithRetry(url);

      if (!res.ok) {
        // If we have stale cache, return it instead of throwing
        if (cached) {
          console.warn(`CoinGecko returned ${res.status}, using stale cache for: ${url}`);
          return cached.data as T;
        }
        throw new Error(`CoinGecko API error: ${res.status}`);
      }

      const data = await res.json();
      cache.set(url, {
        data,
        expires: Date.now() + ttlMs,
        staleAt: Date.now() + ttlMs * 3, // Keep stale data for 3x TTL
      });
      return data as T;
    } catch (error) {
      // Last resort: return stale cache if available
      if (cached) {
        console.warn("CoinGecko fetch failed, returning stale cache:", error);
        return cached.data as T;
      }
      throw error;
    } finally {
      inflightRequests.delete(url);
    }
  })();

  inflightRequests.set(url, fetchPromise);
  return fetchPromise;
}

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

// Get market data for multiple coins
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
    return await fetchWithCache<CoinMarketData[]>(url, 60_000); // 60s cache
  } catch (error) {
    console.warn("CoinGecko getCoinsMarket failed, returning empty array", error);
    return [];
  }
}

// Get simple prices for specific coins
export async function getSimplePrices(
  coinIds: string[],
  currency: string = "usd"
): Promise<Record<string, { [key: string]: number | undefined; usd_24h_change?: number }>> {
  const url = `${BASE_URL}/simple/price?ids=${coinIds.join(",")}&vs_currencies=${currency}&include_24hr_change=true`;
  return fetchWithCache(url, 30_000); // 30s cache
}

// Get coin detail
export async function getCoinDetail(coinId: string): Promise<CoinDetail> {
  const url = `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
  return fetchWithCache<CoinDetail>(url, 300_000); // 5min cache
}

// Get chart data
export async function getCoinChart(
  coinId: string,
  currency: string = "usd",
  days: string = "7"
): Promise<ChartData> {
  const url = `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}`;
  return fetchWithCache<ChartData>(url, 120_000); // 2min cache
}

// Get OHLC data for candlestick charts
export async function getCoinOHLC(
  coinId: string,
  currency: string = "usd",
  days: string = "7"
): Promise<[number, number, number, number, number][]> {
  const url = `${BASE_URL}/coins/${coinId}/ohlc?vs_currency=${currency}&days=${days}`;
  return fetchWithCache(url, 120_000);
}

// Get trending coins
export async function getTrending(): Promise<TrendingCoin[]> {
  try {
    const data = await fetchWithCache<{ coins: TrendingCoin[] }>(
      `${BASE_URL}/search/trending`,
      300_000 // 5min cache
    );
    return data.coins;
  } catch (error) {
    console.warn("CoinGecko getTrending failed, returning empty array", error);
    return [];
  }
}

// Get global market data
export async function getGlobalData(): Promise<GlobalData> {
  return fetchWithCache<GlobalData>(`${BASE_URL}/global`, 120_000);
}

// Search coins
export async function searchCoins(query: string): Promise<{
  coins: { id: string; name: string; symbol: string; thumb: string; market_cap_rank: number }[];
}> {
  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}`;
  return fetchWithCache(url, 60_000);
}
