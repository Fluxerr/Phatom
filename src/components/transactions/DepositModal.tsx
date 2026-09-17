"use client";

import { useState, useCallback } from "react";
import { X, Check, Loader2, ArrowLeftRight } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { SUPPORTED_COINS, NETWORKS } from "@/lib/utils/constants";
import { formatCurrency, formatCoinAmount } from "@/lib/utils/format";
import { CoinMarketData } from "@/lib/api/coingecko";
import styles from "./modal.module.css";

interface Props {
  marketData: CoinMarketData[];
  onClose: () => void;
}

type Step = "coin" | "network" | "amount" | "processing" | "success";

export default function DepositModal({ marketData, onClose }: Props) {
  const { executeReceive } = useWalletStore();
  const [step, setStep] = useState<Step>("coin");
  const [selectedCoin, setSelectedCoin] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [processStep, setProcessStep] = useState(0);
  const [confirmations, setConfirmations] = useState(0);
  const [isFiat, setIsFiat] = useState(false);

  const coinData = marketData.find(c => c.id === selectedCoin);
  const coinConfig = SUPPORTED_COINS.find(c => c.id === selectedCoin);
  const network = NETWORKS.find(n => n.id === selectedNetwork);
  const numInput = parseFloat(amount) || 0;
  const currentPrice = coinData?.current_price || 1;
  const coinAmount = isFiat ? numInput / currentPrice : numInput;
  const fiatValue = isFiat ? numInput : numInput * currentPrice;

  const filteredCoins = SUPPORTED_COINS.filter(c => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase());
  });

  const handleDeposit = useCallback(() => {
    if (coinAmount <= 0) return;
    setStep("processing");
    
    const totalConfs = network?.confirmations || 12;
    let conf = 0;
    
    const steps = [
      "Detecting incoming transaction...",
      "Verifying on blockchain...",
      "Waiting for confirmations...",
      "Finalizing deposit...",
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      conf++;
      setConfirmations(conf);
      
      if (conf === 1) { stepIdx = 1; setProcessStep(1); }
      if (conf === Math.floor(totalConfs * 0.3)) { stepIdx = 2; setProcessStep(2); }
      if (conf >= totalConfs - 1) { stepIdx = 3; setProcessStep(3); }
      
      if (conf >= totalConfs) {
        clearInterval(interval);
        executeReceive(selectedCoin, coinAmount, selectedNetwork, coinData?.current_price || 0);
        setTimeout(() => setStep("success"), 500);
      }
    }, 300);
  }, [coinAmount, network, selectedCoin, selectedNetwork, coinData, executeReceive]);

  return (
    <>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modalSheet}>
        <div className={styles.handle} />
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Deposit</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {step !== "processing" && step !== "success" && (
          <div className={styles.stepIndicator}>
            {[0, 1, 2].map(i => (
              <div key={i} className={`${styles.stepDot} ${i === (step === "coin" ? 0 : step === "network" ? 1 : 2) ? styles.stepDotActive : ""} ${i < (step === "coin" ? 0 : step === "network" ? 1 : 2) ? styles.stepDotCompleted : ""}`} />
            ))}
          </div>
        )}

        {step === "coin" && (
          <>
            <input className={styles.searchInput} placeholder="Search coins..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className={`${styles.coinSelect} ${styles.scrollList}`}>
              {filteredCoins.map(coin => {
                const data = marketData.find(c => c.id === coin.id);
                return (
                  <button key={coin.id} className={styles.coinOption} onClick={() => { setSelectedCoin(coin.id); setStep("network"); }}>
                    {data && <img src={data.image} alt={coin.name} className={styles.coinOptionIcon} />}
                    <div className={styles.coinOptionInfo}>
                      <div className={styles.coinOptionName}>{coin.name}</div>
                      <div className={styles.coinOptionBalance}>{coin.symbol} · {data ? formatCurrency(data.current_price) : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "network" && (
          <>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginBottom: 16 }}>Select deposit network</p>
            <div className={styles.networkList}>
              {(coinConfig?.networks || ["ethereum"]).map(netId => {
                const net = NETWORKS.find(n => n.id === netId) || { id: netId, name: netId, symbol: netId.toUpperCase(), confirmations: 12, avgBlockTime: 10 };
                return (
                  <button key={netId} className={styles.networkOption} onClick={() => { setSelectedNetwork(netId); setStep("amount"); }}>
                    <div className={styles.networkDot} />
                    <span className={styles.networkName}>{net.name}</span>
                    <span className={styles.networkSymbol}>~{net.confirmations} confs</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "amount" && (
          <div className={styles.amountSection}>
            <div className={styles.amountLabel}>Deposit Amount</div>
            <div className={styles.amountInputRow}>
              {isFiat && <div className={styles.amountPrefix}>$</div>}
              <input className={styles.amountInput} type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
              <button className={styles.toggleFiatBtn} onClick={() => setIsFiat(!isFiat)}>
                <ArrowLeftRight size={14} />
                {isFiat ? "USD" : coinConfig?.symbol}
              </button>
            </div>
            <div className={styles.amountFiat}>≈ {isFiat ? formatCoinAmount(coinAmount, coinConfig?.symbol || "") : formatCurrency(fiatValue)}</div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleDeposit} disabled={coinAmount <= 0}>
                Simulate Deposit
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className={styles.processingContainer}>
            <div className={styles.processingSpinner} />
            <p className={styles.processingText}>
              Confirmations: {confirmations}/{network?.confirmations || 12}
            </p>
            <div style={{ width: "100%", height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(confirmations / (network?.confirmations || 12)) * 100}%`,
                background: "var(--brand-primary)",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }} />
            </div>
            <div className={styles.processingSteps}>
              {["Detecting incoming transaction...", "Verifying on blockchain...", "Waiting for confirmations...", "Finalizing deposit..."].map((text, i) => (
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
            <h3 className={styles.successTitle}>Deposit Confirmed!</h3>
            <div className={styles.successAmount}>{formatCoinAmount(coinAmount, coinConfig?.symbol || "")}</div>
            <p className={styles.successDetail}>≈ {formatCurrency(fiatValue)}</p>
            <button className="btn btn-primary btn-full" onClick={onClose} style={{ marginTop: 16 }}>Done</button>
          </div>
        )}
      </div>
    </>
  );
}
