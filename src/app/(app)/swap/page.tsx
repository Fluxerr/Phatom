"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowDownUp, Check, Loader2, Settings2 } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { getCoinsMarket, CoinMarketData } from "@/lib/api/coingecko";
import { SUPPORTED_COINS, canSwap } from "@/lib/utils/constants";
import { formatCurrency, formatCoinAmount } from "@/lib/utils/format";
import styles from "./swap.module.css";

type Step = "input" | "review" | "processing" | "success";

export default function SwapPage() {
  const { balances, executeSwap } = useWalletStore();
  const [marketData, setMarketData] = useState<CoinMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [step, setStep] = useState<Step>("input");
  const [fromCoin, setFromCoin] = useState("ethereum");
  const [toCoin, setToCoin] = useState("solana");
  const [fromAmount, setFromAmount] = useState("");
  const [selectingFor, setSelectingFor] = useState<"from" | "to" | null>(null);
  const [search, setSearch] = useState("");
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const data = await getCoinsMarket(SUPPORTED_COINS.map(c => c.id));
      setMarketData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fromData = marketData.find(c => c.id === fromCoin);
  const toData = marketData.find(c => c.id === toCoin);
  const fromConfig = SUPPORTED_COINS.find(c => c.id === fromCoin);
  const toConfig = SUPPORTED_COINS.find(c => c.id === toCoin);
  const fromBalance = balances[fromCoin] || 0;
  const numFromAmount = parseFloat(fromAmount) || 0;
  const fromFiat = numFromAmount * (fromData?.current_price || 0);
  
  const rate = fromData && toData ? fromData.current_price / toData.current_price : 0;
  const slippage = 0.005; // 0.5%
  const toAmount = numFromAmount * rate * (1 - slippage);
  const toFiat = toAmount * (toData?.current_price || 0);

  const availableCoins = useMemo(() => {
    return SUPPORTED_COINS.filter(c => {
      if (!search) return c.swappable;
      return c.swappable && (c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase()));
    });
  }, [search]);

  const handleSwapDirection = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setFromAmount("");
  };

  const handleSelectCoin = (coinId: string) => {
    if (selectingFor === "from") {
      if (coinId === toCoin) setToCoin(fromCoin);
      setFromCoin(coinId);
    } else {
      if (coinId === fromCoin) setFromCoin(toCoin);
      setToCoin(coinId);
    }
    setSelectingFor(null);
    setSearch("");
  };

  const handleReview = () => {
    if (numFromAmount <= 0) { setError("Enter an amount"); return; }
    if (numFromAmount > fromBalance) { setError("Insufficient balance"); return; }
    if (!canSwap(fromCoin, toCoin)) { setError("This pair cannot be swapped"); return; }
    setError("");
    setStep("review");
  };

  const handleConfirm = useCallback(() => {
    setStep("processing");
    const steps = ["Finding best route...", "Approving token...", "Executing swap...", "Confirming..."];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setProcessStep(i);
      if (i >= steps.length) {
        clearInterval(interval);
        try {
          executeSwap(fromCoin, numFromAmount, toCoin, toAmount, fromData?.current_price || 0, toData?.current_price || 0);
          setTimeout(() => setStep("success"), 500);
        } catch {
          setError("Swap failed");
          setStep("review");
        }
      }
    }, 900);
  }, [fromCoin, toCoin, numFromAmount, toAmount, fromData, toData, executeSwap]);

  if (loading) {
    return <div className="loading-state"><Loader2 className="animate-spin" /></div>;
  }

  // Coin Selector View
  if (selectingFor) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className="btn btn-ghost" onClick={() => { setSelectingFor(null); setSearch(""); }}>Cancel</button>
          <h2 className={styles.title}>Select Token</h2>
          <div style={{ width: 64 }} />
        </div>
        <div style={{ padding: "0 var(--space-4)" }}>
          <input className={styles.searchInput} placeholder="Search tokens..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.coinList}>
          {availableCoins.map(coin => {
            const data = marketData.find(c => c.id === coin.id);
            const bal = balances[coin.id] || 0;
            const isDisabled = selectingFor === "to" ? !canSwap(fromCoin, coin.id) : selectingFor === "from" ? !canSwap(coin.id, toCoin) : false;
            return (
              <button 
                key={coin.id} 
                className={styles.coinRow} 
                onClick={() => !isDisabled && handleSelectCoin(coin.id)}
                style={isDisabled ? { opacity: 0.4 } : {}}
                disabled={isDisabled}
              >
                {data && <img src={data.image} alt={coin.name} className={styles.coinImg} />}
                <div className={styles.coinInfo}>
                  <div className={styles.coinName}>{coin.name} <span style={{ color: "var(--text-tertiary)" }}>{coin.symbol}</span></div>
                  {bal > 0 && <div className={styles.coinBalance}>{formatCoinAmount(bal, coin.symbol)}</div>}
                </div>
                {isDisabled && <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>N/A</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Swap</h1>
        <button className={styles.settingsBtn}><Settings2 size={20} /></button>
      </div>

      <div className={styles.container}>
        {step === "input" && (
          <div className={styles.card}>
            {/* From */}
            <div className={styles.swapBox}>
              <div className={styles.boxHeader}>
                <span className={styles.boxLabel}>You pay</span>
                <span className={styles.boxBalance}>
                  Balance: {formatCoinAmount(fromBalance, fromConfig?.symbol || "")}
                </span>
              </div>
              <div className={styles.inputRow}>
                <input 
                  type="number" 
                  className={styles.amountInput} 
                  placeholder="0" 
                  value={fromAmount} 
                  onChange={e => { setFromAmount(e.target.value); setError(""); }} 
                />
                <button className={styles.tokenSelectBtn} onClick={() => setSelectingFor("from")}>
                  {fromData && <img src={fromData.image} alt="" className={styles.tokenIcon} />}
                  <span>{fromConfig?.symbol}</span>
                  <span className={styles.chevron}>▼</span>
                </button>
              </div>
              <div className={styles.boxFooter}>
                <span className={styles.fiatValue}>≈ {formatCurrency(fromFiat)}</span>
                <button className={styles.maxBtn} onClick={() => setFromAmount(String(fromBalance))}>MAX</button>
              </div>
            </div>

            {/* Swap direction */}
            <div className={styles.swapDirectionWrapper}>
              <button className={styles.swapDirectionBtn} onClick={handleSwapDirection}>
                <ArrowDownUp size={18} />
              </button>
            </div>

            {/* To */}
            <div className={styles.swapBox}>
              <div className={styles.boxHeader}>
                <span className={styles.boxLabel}>You receive</span>
              </div>
              <div className={styles.inputRow}>
                <div className={`${styles.amountInput} ${toAmount > 0 ? "" : styles.amountInputEmpty}`}>
                  {toAmount > 0 ? toAmount.toFixed(6) : "0"}
                </div>
                <button className={styles.tokenSelectBtn} onClick={() => setSelectingFor("to")}>
                  {toData && <img src={toData.image} alt="" className={styles.tokenIcon} />}
                  <span>{toConfig?.symbol}</span>
                  <span className={styles.chevron}>▼</span>
                </button>
              </div>
              <div className={styles.boxFooter}>
                <span className={styles.fiatValue}>≈ {formatCurrency(toFiat)}</span>
              </div>
            </div>

            {rate > 0 && (
              <div className={styles.rateInfo}>
                1 {fromConfig?.symbol} ≈ {rate.toFixed(6)} {toConfig?.symbol}
              </div>
            )}

            {error && <p className={styles.errorText}>{error}</p>}

            <button className="btn btn-primary btn-full btn-lg" onClick={handleReview} style={{ marginTop: 16 }}>
              Review Swap
            </button>
          </div>
        )}

        {step === "review" && (
          <div className={styles.card}>
            <h3 style={{ marginBottom: 24, textAlign: "center" }}>Review Swap</h3>
            <div className={styles.reviewList}>
              <div className={styles.reviewRow}>
                <span>You Pay</span>
                <span className={styles.reviewValue}>{formatCoinAmount(numFromAmount, fromConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span>You Receive</span>
                <span className={styles.reviewValue}>{formatCoinAmount(toAmount, toConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span>Rate</span>
                <span className={styles.reviewValue}>1 {fromConfig?.symbol} = {rate.toFixed(4)} {toConfig?.symbol}</span>
              </div>
              <div className={styles.reviewRow}>
                <span>Slippage</span>
                <span className={styles.reviewValue}>0.5%</span>
              </div>
              <div className={styles.reviewRow}>
                <span>Network Fee</span>
                <span className={styles.reviewValue}>~{formatCurrency(2.50)}</span>
              </div>
            </div>
            
            <button className="btn btn-primary btn-full btn-lg" onClick={handleConfirm} style={{ marginTop: 24 }}>
              Confirm Swap
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => setStep("input")} style={{ marginTop: 8 }}>
              Back
            </button>
          </div>
        )}

        {step === "processing" && (
          <div className={styles.card} style={{ padding: "40px 20px" }}>
            <div className={styles.processingContainer}>
              <div className={styles.spinnerLg} />
              <div className={styles.processSteps}>
                {["Finding best route...", "Approving token...", "Executing swap...", "Confirming..."].map((text, i) => (
                  <div key={i} className={`${styles.pStep} ${i < processStep ? styles.pStepDone : ""} ${i === processStep ? styles.pStepActive : ""}`}>
                    <div className={`${styles.pStepIcon} ${i < processStep ? styles.pStepIconDone : ""} ${i === processStep ? styles.pStepIconActive : ""}`}>
                      {i < processStep ? <Check size={12} /> : i === processStep ? <Loader2 size={12} className="animate-spin" /> : (i + 1)}
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className={styles.card} style={{ padding: "40px 20px", textAlign: "center" }}>
            <div className={styles.successIcon}><Check size={40} /></div>
            <h2 style={{ marginBottom: 16 }}>Swap Complete!</h2>
            <div style={{ fontSize: "var(--font-xl)", fontWeight: 700, marginBottom: 8 }}>
              {formatCoinAmount(numFromAmount, fromConfig?.symbol || "")} → {formatCoinAmount(toAmount, toConfig?.symbol || "")}
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>Transaction confirmed</p>
            <button className="btn btn-primary btn-full" onClick={() => { setStep("input"); setFromAmount(""); }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
