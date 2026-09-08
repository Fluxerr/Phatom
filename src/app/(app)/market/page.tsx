"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp } from "lucide-react";
import { getCoinsMarket, getTrending, getGlobalData, CoinMarketData, TrendingCoin, GlobalData } from "@/lib/api/coingecko";
import { MARKET_CATEGORIES } from "@/lib/utils/constants";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import styles from "./market.module.css";

export default function MarketPage() {
  const router = useRouter();
  const [coins, setCoins] = useState<CoinMarketData[]>([]);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
            {trending.slice(0, 7).map(t => (
              <button
                key={t.item.id}
                className={styles.trendingCard}
                onClick={() => router.push(`/wallet/${t.item.id}`)}
              >
                <img src={t.item.thumb} alt={t.item.name} className={styles.trendingImg} />
                <span className={styles.trendingName}>{t.item.symbol.toUpperCase()}</span>
                <span className={styles.trendingRank}>#{t.item.market_cap_rank || "—"}</span>
              </button>
            ))}
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

      {/* Coin List */}
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
              <div className={`skeleton`} style={{ width: 20, height: 14 }} />
              <div className={`skeleton`} style={{ width: 32, height: 32, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <div className={`skeleton`} style={{ width: 80, height: 14, marginBottom: 4 }} />
                <div className={`skeleton`} style={{ width: 40, height: 12 }} />
              </div>
              <div className={`skeleton`} style={{ width: 60, height: 14 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.coinList}>
          {filteredCoins.map((coin) => (
            <button
              key={coin.id}
              className={styles.coinRow}
              onClick={() => router.push(`/wallet/${coin.id}`)}
            >
              <span className={styles.colRank}>{coin.market_cap_rank}</span>
              <img src={coin.image} alt={coin.name} className={styles.coinImg} />
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
            <button className="btn btn-secondary btn-full" style={{ marginTop: 16 }} onClick={() => setPage(p => p + 1)}>
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}
