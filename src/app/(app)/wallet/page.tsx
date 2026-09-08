"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, RefreshCw } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { getCoinsMarket, CoinMarketData } from "@/lib/api/coingecko";
import { SUPPORTED_COINS } from "@/lib/utils/constants";
import { formatCurrency, formatPercent, formatCoinAmount } from "@/lib/utils/format";
import SendModal from "@/components/transactions/SendModal";
import ReceiveModal from "@/components/transactions/ReceiveModal";
import DepositModal from "@/components/transactions/DepositModal";
import SwapModal from "@/components/transactions/SwapModal";
import styles from "./wallet.module.css";

export default function WalletPage() {
  const router = useRouter();
  const { balances, hideBalance, toggleHideBalance, visibleCoins } = useWalletStore();
  const currency = useSettingsStore(s => s.currency);
  const [marketData, setMarketData] = useState<CoinMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeModal, setActiveModal] = useState<"send" | "receive" | "deposit" | "swap" | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const coinIds = SUPPORTED_COINS.map(c => c.id);
      const data = await getCoinsMarket(coinIds, currency, 1, 50, true);
      setMarketData(data);
    } catch (err) {
      console.error("Failed to fetch market data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate total portfolio value
  const { totalValue, totalChange } = useMemo(() => {
    let total = 0;
    let prevTotal = 0;
    Object.entries(balances).forEach(([coinId, amount]) => {
      if (amount <= 0) return;
      const coin = marketData.find(c => c.id === coinId);
      if (coin) {
        const value = amount * coin.current_price;
        total += value;
        const prevPrice = coin.current_price / (1 + coin.price_change_percentage_24h / 100);
        prevTotal += amount * prevPrice;
      }
    });
    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;
    return { totalValue: total, totalChange: change };
  }, [balances, marketData]);

  // Visible coins with data
  const portfolioCoins = useMemo(() => {
    return visibleCoins
      .map(coinId => {
        const data = marketData.find(c => c.id === coinId);
        const balance = balances[coinId] || 0;
        const config = SUPPORTED_COINS.find(c => c.id === coinId);
        if (!data || !config) return null;
        return {
          ...data,
          balance,
          fiatValue: balance * data.current_price,
          symbol: config.symbol,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.fiatValue || 0) - (a?.fiatValue || 0)) as (CoinMarketData & {
        balance: number;
        fiatValue: number;
      })[];
  }, [visibleCoins, marketData, balances]);

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.avatar}>P</div>
          <span className={styles.walletLabel}>Phantom</span>
        </div>
        <button className={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Portfolio Card */}
      <div className={styles.portfolioCard}>
        <div className={styles.portfolioHeader}>
          <span className={styles.portfolioLabel}>Total Balance</span>
          <button onClick={toggleHideBalance} className={styles.eyeBtn}>
            {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className={styles.balanceRow}>
          <h1 className={styles.balance}>
            {hideBalance ? "••••••" : formatCurrency(totalValue, currency)}
          </h1>
        </div>
        <div className={styles.changeRow}>
          <span className={`badge ${totalChange >= 0 ? "badge-success" : "badge-danger"}`}>
            {hideBalance ? "••••" : formatPercent(totalChange)}
          </span>
          <span className={styles.changeLabel}>24h</span>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionRow}>
          <button className={styles.actionBtn} onClick={() => setActiveModal("deposit")}>
            <div className={styles.actionIcon}>
              <Plus size={20} />
            </div>
            <span>Deposit</span>
          </button>
          <button className={styles.actionBtn} onClick={() => setActiveModal("send")}>
            <div className={styles.actionIcon}>
              <ArrowUpRight size={20} />
            </div>
            <span>Send</span>
          </button>
          <button className={styles.actionBtn} onClick={() => setActiveModal("receive")}>
            <div className={styles.actionIcon}>
              <ArrowDownLeft size={20} />
            </div>
            <span>Receive</span>
          </button>
          <button className={styles.actionBtn} onClick={() => setActiveModal("swap")}>
            <div className={styles.actionIcon}>
              <ArrowLeftRight size={20} />
            </div>
            <span>Swap</span>
          </button>
        </div>
      </div>

      {/* Asset List */}
      <div className={styles.assetSection}>
        <div className={styles.assetHeader}>
          <h3 className={styles.assetTitle}>Your Assets</h3>
          <span className={styles.assetCount}>{portfolioCoins.length}</span>
        </div>
        
        {loading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={`skeleton ${styles.skeletonIcon}`} />
                <div className={styles.skeletonText}>
                  <div className={`skeleton ${styles.skeletonLine}`} />
                  <div className={`skeleton ${styles.skeletonLineShort}`} />
                </div>
                <div className={styles.skeletonRight}>
                  <div className={`skeleton ${styles.skeletonLine}`} />
                  <div className={`skeleton ${styles.skeletonLineShort}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.assetList}>
            {portfolioCoins.map((coin, index) => (
              <button
                key={coin.id}
                className={styles.assetRow}
                onClick={() => router.push(`/wallet/${coin.id}`)}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <img
                  src={coin.image}
                  alt={coin.name}
                  className={styles.coinIcon}
                  width={40}
                  height={40}
                />
                <div className={styles.coinInfo}>
                  <span className={styles.coinName}>{coin.name}</span>
                  <span className={styles.coinMeta}>
                    {formatCurrency(coin.current_price, currency)}
                    <span className={coin.price_change_percentage_24h >= 0 ? "price-up" : "price-down"}>
                      {" "}{formatPercent(coin.price_change_percentage_24h)}
                    </span>
                  </span>
                </div>
                <div className={styles.coinBalance}>
                  <span className={styles.coinValue}>
                    {hideBalance ? "••••" : formatCurrency(coin.fiatValue, currency)}
                  </span>
                  <span className={styles.coinAmount}>
                    {hideBalance ? "••••" : formatCoinAmount(coin.balance, coin.symbol.toUpperCase())}
                  </span>
                </div>
                {/* Mini sparkline */}
                {coin.sparkline_in_7d && (
                  <div className={styles.sparkline}>
                    <MiniSparkline
                      data={coin.sparkline_in_7d.price}
                      positive={coin.price_change_percentage_24h >= 0}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === "send" && (
        <SendModal
          marketData={marketData}
          onClose={() => { setActiveModal(null); setSelectedCoin(null); }}
          preselectedCoin={selectedCoin}
        />
      )}
      {activeModal === "receive" && (
        <ReceiveModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "deposit" && (
        <DepositModal
          marketData={marketData}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "swap" && (
        <SwapModal
          marketData={marketData}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

// Mini sparkline SVG component
function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  
  const samples = data.length > 30 ? data.filter((_, i) => i % Math.ceil(data.length / 30) === 0) : data;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min || 1;
  const width = 60;
  const height = 24;

  const points = samples.map((val, i) => {
    const x = (i / (samples.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "var(--color-success)" : "var(--color-danger)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
