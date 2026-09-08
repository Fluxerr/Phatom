"use client";

import { useState, useMemo, useCallback } from "react";
import { X, ArrowDownUp, Check, Loader2 } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { SUPPORTED_COINS, canSwap } from "@/lib/utils/constants";
import { formatCurrency, formatCoinAmount } from "@/lib/utils/format";
import { CoinMarketData } from "@/lib/api/coingecko";
import styles from "./modal.module.css";

interface Props {
  marketData: CoinMarketData[];
  onClose: () => void;
}

type Step = "input" | "review" | "processing" | "success";

export default function SwapModal({ marketData, onClose }: Props) {
  const { balances, executeSwap } = useWalletStore();
  const [step, setStep] = useState<Step>("input");
  const [fromCoin, setFromCoin] = useState("ethereum");
  const [toCoin, setToCoin] = useState("solana");
  const [fromAmount, setFromAmount] = useState("");
  const [selectingFor, setSelectingFor] = useState<"from" | "to" | null>(null);
  const [search, setSearch] = useState("");
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState("");

  const fromData = marketData.find(c => c.id === fromCoin);
  const toData = marketData.find(c => c.id === toCoin);
  const fromConfig = SUPPORTED_COINS.find(c => c.id === fromCoin);
  const toConfig = SUPPORTED_COINS.find(c => c.id === toCoin);
  const fromBalance = balances[fromCoin] || 0;
  const numFromAmount = parseFloat(fromAmount) || 0;
  const fromFiat = numFromAmount * (fromData?.current_price || 0);
  
  // Calculate swap output
  const rate = fromData && toData ? fromData.current_price / toData.current_price : 0;
  const slippage = 0.005; // 0.5% simulated slippage
  const toAmount = numFromAmount * rate * (1 - slippage);
  const toFiat = toAmount * (toData?.current_price || 0);

  // Filter coins that can be swapped with the other selection
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

  // Coin selector overlay
  if (selectingFor) {
    return (
      <>
        <div className={styles.modalBackdrop} onClick={() => { setSelectingFor(null); setSearch(""); }} />
        <div className={styles.modalSheet}>
          <div className={styles.handle} />
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Select Token</h3>
            <button className={styles.closeBtn} onClick={() => { setSelectingFor(null); setSearch(""); }}><X size={16} /></button>
          </div>
          <input className={styles.searchInput} placeholder="Search tokens..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className={`${styles.coinSelect} ${styles.scrollList}`}>
            {availableCoins.map(coin => {
              const data = marketData.find(c => c.id === coin.id);
              const bal = balances[coin.id] || 0;
              const isDisabled = selectingFor === "to" ? !canSwap(fromCoin, coin.id) : selectingFor === "from" ? !canSwap(coin.id, toCoin) : false;
              return (
                <button 
                  key={coin.id} 
                  className={`${styles.coinOption} ${isDisabled ? "" : ""}`} 
                  onClick={() => !isDisabled && handleSelectCoin(coin.id)}
                  style={isDisabled ? { opacity: 0.4 } : {}}
                  disabled={isDisabled}
                >
                  {data && <img src={data.image} alt={coin.name} className={styles.coinOptionIcon} />}
                  <div className={styles.coinOptionInfo}>
                    <div className={styles.coinOptionName}>{coin.name} <span style={{ color: "var(--text-tertiary)" }}>{coin.symbol}</span></div>
                    {bal > 0 && <div className={styles.coinOptionBalance}>{formatCoinAmount(bal, coin.symbol)}</div>}
                  </div>
                  {isDisabled && <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>N/A</span>}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modalSheet}>
        <div className={styles.handle} />
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Swap</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {step === "input" && (
          <>
            {/* From */}
            <div style={{ marginBottom: 8 }}>
              <div className={styles.amountLabel}>From</div>
              <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", border: "1px solid var(--border-primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <button onClick={() => setSelectingFor("from")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {fromData && <img src={fromData.image} width={24} height={24} style={{ borderRadius: "50%" }} alt="" />}
                    <span style={{ fontWeight: 600 }}>{fromConfig?.symbol}</span>
                    <span style={{ color: "var(--text-muted)" }}>▼</span>
                  </button>
                  <span style={{ fontSize: "var(--font-xs)", color: "var(--text-tertiary)" }}>
                    Balance: {formatCoinAmount(fromBalance, fromConfig?.symbol || "")}
                  </span>
                </div>
                <div className={styles.amountInputRow} style={{ border: "none", background: "transparent", padding: 0 }}>
                  <input className={styles.amountInput} type="number" placeholder="0.00" value={fromAmount} onChange={e => { setFromAmount(e.target.value); setError(""); }} />
                  <button className={styles.maxBtn} onClick={() => setFromAmount(String(fromBalance))}>MAX</button>
                </div>
                <div className={styles.amountFiat}>≈ {formatCurrency(fromFiat)}</div>
              </div>
            </div>

            {/* Swap direction button */}
            <div style={{ display: "flex", justifyContent: "center", margin: "-4px 0", position: "relative", zIndex: 2 }}>
              <button onClick={handleSwapDirection} style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--bg-secondary)", border: "2px solid var(--border-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--brand-primary)", transition: "all 0.2s ease",
              }}>
                <ArrowDownUp size={16} />
              </button>
            </div>

            {/* To */}
            <div style={{ marginBottom: 16 }}>
              <div className={styles.amountLabel}>To</div>
              <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", border: "1px solid var(--border-primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <button onClick={() => setSelectingFor("to")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {toData && <img src={toData.image} width={24} height={24} style={{ borderRadius: "50%" }} alt="" />}
                    <span style={{ fontWeight: 600 }}>{toConfig?.symbol}</span>
                    <span style={{ color: "var(--text-muted)" }}>▼</span>
                  </button>
                </div>
                <div style={{ fontSize: "var(--font-xl)", fontWeight: 600, color: toAmount > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {toAmount > 0 ? toAmount.toFixed(6) : "0.00"}
                </div>
                <div className={styles.amountFiat}>≈ {formatCurrency(toFiat)}</div>
              </div>
            </div>

            {/* Rate info */}
            {rate > 0 && (
              <div style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", textAlign: "center", marginBottom: 16 }}>
                1 {fromConfig?.symbol} ≈ {rate.toFixed(6)} {toConfig?.symbol}
              </div>
            )}

            {error && <p style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)", textAlign: "center", marginBottom: 8 }}>{error}</p>}
            
            <button className="btn btn-primary btn-full btn-lg" onClick={handleReview}>
              Review Swap
            </button>
          </>
        )}

        {step === "review" && (
          <>
            <div className={styles.reviewSection}>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>You Pay</span>
                <span className={styles.reviewValue}>{formatCoinAmount(numFromAmount, fromConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>You Receive</span>
                <span className={styles.reviewValue}>{formatCoinAmount(toAmount, toConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Exchange Rate</span>
                <span className={styles.reviewValue}>1 {fromConfig?.symbol} = {rate.toFixed(4)} {toConfig?.symbol}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Slippage</span>
                <span className={styles.reviewValue}>0.5%</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Network Fee</span>
                <span className={styles.reviewValue}>~{formatCurrency(2.50)}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleConfirm}>Confirm Swap</button>
            <button className="btn btn-ghost btn-full" onClick={() => setStep("input")} style={{ marginTop: 8 }}>Back</button>
          </>
        )}

        {step === "processing" && (
          <div className={styles.processingContainer}>
            <div className={styles.processingSpinner} />
            <div className={styles.processingSteps}>
              {["Finding best route...", "Approving token...", "Executing swap...", "Confirming..."].map((text, i) => (
                <div key={i} className={`${styles.processingStep} ${i < processStep ? styles.processingStepDone : ""} ${i === processStep ? styles.processingStepActive : ""}`}>
                  <div className={`${styles.processingStepIcon} ${i < processStep ? styles.processingStepIconDone : ""} ${i === processStep ? styles.processingStepIconActive : ""}`}>
                    {i < processStep ? <Check size={12} /> : i === processStep ? <Loader2 size={12} className="animate-spin" /> : (i + 1)}
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "success" && (
          <div className={styles.successContainer}>
            <div className={styles.successIcon}><Check size={32} /></div>
            <h3 className={styles.successTitle}>Swap Complete!</h3>
            <div className={styles.successAmount}>
              {formatCoinAmount(numFromAmount, fromConfig?.symbol || "")} → {formatCoinAmount(toAmount, toConfig?.symbol || "")}
            </div>
            <button className="btn btn-primary btn-full" onClick={onClose} style={{ marginTop: 16 }}>Done</button>
          </div>
        )}
      </div>
    </>
  );
}
