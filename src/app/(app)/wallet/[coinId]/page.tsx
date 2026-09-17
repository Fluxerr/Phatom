"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, AlertCircle, RefreshCw } from "lucide-react";
import { getCoinChart, getCoinDetail, getCoinsMarket, CoinMarketData, CoinDetail, ChartData } from "@/lib/api/coingecko";
import { useWalletStore } from "@/lib/store/walletStore";
import { SUPPORTED_COINS } from "@/lib/utils/constants";
import { formatCurrency, formatPercent, formatCoinAmount } from "@/lib/utils/format";
import SendModal from "@/components/transactions/SendModal";
import ReceiveModal from "@/components/transactions/ReceiveModal";
import DepositModal from "@/components/transactions/DepositModal";
import SwapModal from "@/components/transactions/SwapModal";
import CryptoIcon from "@/components/CryptoIcon";
import styles from "./coinDetail.module.css";

const TIME_RANGES = [
  { label: "24H", days: "1" },
  { label: "1W", days: "7" },
  { label: "1M", days: "30" },
  { label: "3M", days: "90" },
  { label: "1Y", days: "365" },
  { label: "ALL", days: "max" },
];

export default function CoinDetailPage({ params }: { params: Promise<{ coinId: string }> }) {
  const { coinId } = use(params);
  const router = useRouter();
  const chartRef = useRef<HTMLDivElement>(null);
  const { balances } = useWalletStore();
  const [marketData, setMarketData] = useState<CoinMarketData[]>([]);
  const [coinDetail, setCoinDetail] = useState<CoinDetail | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [selectedRange, setSelectedRange] = useState("7");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeModal, setActiveModal] = useState<"send" | "receive" | "deposit" | "swap" | null>(null);

  const coinConfig = SUPPORTED_COINS.find(c => c.id === coinId);
  const coin = marketData.find(c => c.id === coinId);
  const balance = balances[coinId] || 0;
  const fiatValue = balance * (coin?.current_price || 0);

  const fetchData = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const [market, detail, chart] = await Promise.all([
        getCoinsMarket([coinId]),
        getCoinDetail(coinId),
        getCoinChart(coinId, "usd", selectedRange),
      ]);
      setMarketData(market);
      setCoinDetail(detail);
      setChartData(chart);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [coinId, selectedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRangeChange = async (days: string) => {
    setSelectedRange(days);
    try {
      const chart = await getCoinChart(coinId, "usd", days);
      setChartData(chart);
    } catch (err) {
      console.error(err);
    }
  };

  // Simple SVG chart
  const chartPoints = chartData?.prices || [];
  const chartSVG = (() => {
    if (chartPoints.length < 2) return null;
    const prices = chartPoints.map(p => p[1]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const width = 400;
    const height = 200;
    const points = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 20) - 10;
      return `${x},${y}`;
    });
    const isUp = prices[prices.length - 1] >= prices[0];
    const color = isUp ? "var(--color-success)" : "var(--color-danger)";
    const gradientId = `chartGrad_${coinId}_${isUp ? "up" : "down"}`;
    const fillPoints = `0,${height} ${points.join(" ")} ${width},${height}`;

    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isUp ? "#10B981" : "#EF4444"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill={`url(#${gradientId})`} />
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  })();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <div className={styles.topBarCenter}>
            <span className={styles.topBarTitle}>{coinConfig?.name || coinId}</span>
          </div>
          <div style={{ width: 36 }} />
        </div>
        <div style={{ padding: "var(--space-4)" }}>
          <div className="skeleton" style={{ height: 200, borderRadius: "var(--radius-lg)", marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 32, width: 180, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 20, width: 100 }} />
        </div>
      </div>
    );
  }

  if (error && !coin) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <div className={styles.topBarCenter}>
            <span className={styles.topBarTitle}>{coinConfig?.name || coinId}</span>
          </div>
          <div style={{ width: 36 }} />
        </div>
        <div className="error-state">
          <div className="error-state-icon">
            <AlertCircle size={28} />
          </div>
          <h3 style={{ fontSize: "var(--font-lg)", fontWeight: 700 }}>Failed to Load</h3>
          <p style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", maxWidth: 260, textAlign: "center" }}>
            Could not fetch data for {coinConfig?.name || coinId}. This may be due to API rate limits.
          </p>
          <button className="btn btn-primary" onClick={fetchData} style={{ marginTop: 8 }}>
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </button>
        <div className={styles.topBarCenter}>
          <CryptoIcon src={coin?.image} symbol={coinConfig?.symbol || coinId} name={coinConfig?.name || coinId} size={24} />
          <span className={styles.topBarTitle}>{coinConfig?.name || coinId}</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Price */}
      <div className={styles.priceSection}>
        <h1 className={styles.price}>{coin ? formatCurrency(coin.current_price) : "—"}</h1>
        {coin && (
          <span className={`badge ${coin.price_change_percentage_24h >= 0 ? "badge-success" : "badge-danger"}`}>
            {formatPercent(coin.price_change_percentage_24h)}
          </span>
        )}
      </div>

      {/* Chart */}
      <div className={styles.chartContainer} ref={chartRef}>
        {chartSVG || (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            No chart data available
          </div>
        )}
      </div>

      {/* Time Range */}
      <div className={styles.timeRange}>
        {TIME_RANGES.map(tr => (
          <button
            key={tr.days}
            className={`chip ${selectedRange === tr.days ? "chip-active" : ""}`}
            onClick={() => handleRangeChange(tr.days)}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={() => setActiveModal("deposit")}>
          <div className={styles.actionIcon}><Plus size={18} /></div>
          <span>Deposit</span>
        </button>
        <button className={styles.actionBtn} onClick={() => setActiveModal("send")}>
          <div className={styles.actionIcon}><ArrowUpRight size={18} /></div>
          <span>Send</span>
        </button>
        <button className={styles.actionBtn} onClick={() => setActiveModal("receive")}>
          <div className={styles.actionIcon}><ArrowDownLeft size={18} /></div>
          <span>Receive</span>
        </button>
        <button className={styles.actionBtn} onClick={() => setActiveModal("swap")}>
          <div className={styles.actionIcon}><ArrowLeftRight size={18} /></div>
          <span>Swap</span>
        </button>
      </div>

      {/* Holdings */}
      {balance > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Your Holdings</h3>
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <div className={styles.holdingRow}>
              <span className={styles.holdingLabel}>Balance</span>
              <span className={styles.holdingValue}>{formatCoinAmount(balance, coinConfig?.symbol || "")}</span>
            </div>
            <div className={styles.holdingRow}>
              <span className={styles.holdingLabel}>Value</span>
              <span className={styles.holdingValue}>{formatCurrency(fiatValue)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Market Stats</h3>
        <div className="card" style={{ padding: "var(--space-4)" }}>
          {coin && (
            <>
              <div className={styles.statRow}><span>Market Cap</span><span>{formatCurrency(coin.market_cap, "usd", true)}</span></div>
              <div className={styles.statRow}><span>24h Volume</span><span>{formatCurrency(coin.total_volume, "usd", true)}</span></div>
              <div className={styles.statRow}><span>Circulating Supply</span><span>{coin.circulating_supply.toLocaleString()}</span></div>
              {coin.max_supply && <div className={styles.statRow}><span>Max Supply</span><span>{coin.max_supply.toLocaleString()}</span></div>}
              <div className={styles.statRow}><span>All-Time High</span><span>{formatCurrency(coin.ath)}</span></div>
              <div className={styles.statRow}><span>All-Time Low</span><span>{formatCurrency(coin.atl)}</span></div>
              <div className={styles.statRow}><span>Rank</span><span>#{coin.market_cap_rank}</span></div>
            </>
          )}
        </div>
      </div>

      {/* About */}
      {coinDetail?.description?.en && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>About {coinConfig?.name}</h3>
          <div className="card" style={{ padding: "var(--space-4)" }}>
            <p className={styles.description}>
              {coinDetail.description.en.replace(/<[^>]*>/g, "").slice(0, 300)}...
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === "send" && <SendModal marketData={marketData} onClose={() => setActiveModal(null)} preselectedCoin={coinId} />}
      {activeModal === "receive" && <ReceiveModal onClose={() => setActiveModal(null)} />}
      {activeModal === "deposit" && <DepositModal marketData={marketData} onClose={() => setActiveModal(null)} />}
      {activeModal === "swap" && <SwapModal marketData={marketData} onClose={() => setActiveModal(null)} />}
    </div>
  );
}
