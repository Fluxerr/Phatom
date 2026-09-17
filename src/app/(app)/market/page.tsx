"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { getCoinsMarket, getTrending, getGlobalData, CoinMarketData, TrendingCoin, GlobalData } from "@/lib/api/coingecko";
import { MARKET_CATEGORIES } from "@/lib/utils/constants";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import CryptoIcon from "@/components/CryptoIcon";
import styles from "./market.module.css";

export default function MarketPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<CoinMarketData[]>([]);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [market, trend, global] = await Promise.all([
        getCoinsMarket(undefined, "usd", page, 50, true, category !== "all" ? category : undefined),
        page === 1 ? getTrending() : Promise.resolve([]),
        page === 1 ? getGlobalData() : Promise.resolve(null),
      ]);
      if (page === 1) {
        setCoins(market);
      } else {
        setCoins(prev => [...prev, ...market]);
      }
      if (trend.length) setTrending(trend);
      if (global) setGlobalData(global);

      if (market.length === 0 && page === 1) {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      if (coins.length === 0) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, category]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPage(1);
    setCoins([]);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setPage(p => p + 1);
  };

  const filteredCoins = search
    ? coins.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase()))
    : coins;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Market</h1>
      </div>

      {/* Global Stats */}
      {globalData && (
        <div className={styles.globalStats}>
          <div className={styles.globalStat}>
            <span className={styles.globalLabel}>Market Cap</span>
            <span className={styles.globalValue}>{formatCurrency(globalData.data.total_market_cap.usd, "usd", true)}</span>
          </div>
          <div className={styles.globalStat}>
            <span className={styles.globalLabel}>24h Vol</span>
            <span className={styles.globalValue}>{formatCurrency(globalData.data.total_volume.usd, "usd", true)}</span>
          </div>
          <div className={styles.globalStat}>
            <span className={styles.globalLabel}>BTC Dom</span>
            <span className={styles.globalValue}>{globalData.data.market_cap_percentage.btc?.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Trending */}
      {trending.length > 0 && !search && category === "all" && (
        <div className={styles.trendingSection}>
          <div className={styles.sectionHeader}>
            <TrendingUp size={16} />
            <span>Trending</span>
          </div>
          <div className={styles.trendingScroll}>
            {trending.slice(0, 7).map(t => {
              const change24 = t.item.data?.price_change_percentage_24h?.usd || 0;
              const priceUsd = t.item.data?.price || (t.item.price_btc * 64000);
              return (
                <button
                  key={t.item.id}
                  className={styles.trendingCard}
                  onClick={() => router.push(`/wallet/${t.item.id}`)}
                >
                  <CryptoIcon src={t.item.large || t.item.thumb} symbol={t.item.symbol} name={t.item.name} size={32} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <span className={styles.trendingName}>{t.item.symbol.toUpperCase()}</span>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                      {priceUsd > 0 ? formatCurrency(priceUsd) : `#${t.item.market_cap_rank || "—"}`}
                    </span>
                  </div>
                  {change24 !== 0 && (
                    <span className={`badge ${change24 >= 0 ? "badge-success" : "badge-danger"}`} style={{ fontSize: "10px", padding: "2px 6px" }}>
                      {formatPercent(change24)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className={styles.searchContainer}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search coins..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className={styles.categories}>
        {MARKET_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`chip ${category === cat.id ? "chip-active" : ""}`}
            onClick={() => handleCategoryChange(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && coins.length === 0 && !loading && (
        <div className="error-state">
          <div className="error-state-icon">
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: "var(--font-lg)", fontWeight: 700 }}>Failed to Load Market</h3>
          <p style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", maxWidth: 260 }}>
            Could not fetch market data. This may be due to API rate limits. Please try again.
          </p>
          <button className="btn btn-primary" onClick={() => { setLoading(true); fetchData(); }} style={{ marginTop: 8 }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {/* Coin List */}
      {(coins.length > 0 || loading) && (
        <>
          <div className={styles.listHeader}>
            <span className={styles.colRank}>#</span>
            <span className={styles.colName}>Name</span>
            <span className={styles.colPrice}>Price</span>
            <span className={styles.colChange}>24h</span>
          </div>
          
          {loading && coins.length === 0 ? (
            <div className={styles.skeletons}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={styles.skeletonRow}>
                  <div className="skeleton" style={{ width: 20, height: 14 }} />
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: 80, height: 14, marginBottom: 4 }} />
                    <div className="skeleton" style={{ width: 40, height: 12 }} />
                  </div>
                  <div className="skeleton" style={{ width: 60, height: 14 }} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.coinList}>
              {filteredCoins.map((coin, index) => (
                <button
                  key={coin.id}
                  className={styles.coinRow}
                  onClick={() => router.push(`/wallet/${coin.id}`)}
                  style={{ animationDelay: `${Math.min(index, 20) * 30}ms` }}
                >
                  <span className={styles.colRank}>{coin.market_cap_rank}</span>
                  <CryptoIcon src={coin.image} symbol={coin.symbol} name={coin.name} size={36} className={styles.coinImg} />
                  <div className={styles.coinInfo}>
                    <span className={styles.coinName}>{coin.name}</span>
                    <span className={styles.coinSymbol}>{coin.symbol.toUpperCase()}</span>
                  </div>
                  <span className={styles.coinPrice}>{formatCurrency(coin.current_price)}</span>
                  <span className={`${styles.coinChange} ${coin.price_change_percentage_24h >= 0 ? "price-up" : "price-down"}`}>
                    {formatPercent(coin.price_change_percentage_24h)}
                  </span>
                </button>
              ))}
              {!search && (
                <button
                  className="btn btn-secondary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? <><Loader2 size={16} className="animate-spin" /> Loading...</> : "Load More"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
