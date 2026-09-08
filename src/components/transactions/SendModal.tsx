"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { SUPPORTED_COINS } from "@/lib/utils/constants";
import { formatCurrency, formatCoinAmount } from "@/lib/utils/format";
import { CoinMarketData } from "@/lib/api/coingecko";
import styles from "./modal.module.css";

interface Props {
  marketData: CoinMarketData[];
  onClose: () => void;
  preselectedCoin?: string | null;
}

type Step = "select" | "address" | "amount" | "review" | "processing" | "success";

export default function SendModal({ marketData, onClose, preselectedCoin }: Props) {
  const { balances, executeSend } = useWalletStore();
  const [step, setStep] = useState<Step>(preselectedCoin ? "address" : "select");
  const [selectedCoin, setSelectedCoin] = useState(preselectedCoin || "");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState("");

  const coinData = marketData.find(c => c.id === selectedCoin);
  const coinConfig = SUPPORTED_COINS.find(c => c.id === selectedCoin);
  const balance = balances[selectedCoin] || 0;
  const numAmount = parseFloat(amount) || 0;
  const fiatValue = numAmount * (coinData?.current_price || 0);
  const fee = numAmount * 0.001;

  const filteredCoins = SUPPORTED_COINS.filter(c => {
    const bal = balances[c.id] || 0;
    if (bal <= 0) return false;
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelectCoin = (coinId: string) => {
    setSelectedCoin(coinId);
    setStep("address");
  };

  const handleAddressNext = () => {
    if (address.length < 10) {
      setError("Please enter a valid address");
      return;
    }
    setError("");
    setStep("amount");
  };

  const handleAmountNext = () => {
    if (numAmount <= 0) {
      setError("Enter an amount");
      return;
    }
    if (numAmount + fee > balance) {
      setError("Insufficient balance");
      return;
    }
    setError("");
    setStep("review");
  };

  const handleConfirm = useCallback(() => {
    setStep("processing");
    const steps = [
      "Validating address...",
      "Preparing transaction...",
      "Broadcasting to network...",
      "Confirming...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setProcessStep(i);
      if (i >= steps.length) {
        clearInterval(interval);
        try {
          executeSend(
            selectedCoin,
            numAmount,
            address,
            coinConfig?.networks[0] || "ethereum",
            coinData?.current_price || 0
          );
          setTimeout(() => setStep("success"), 500);
        } catch {
          setError("Transaction failed");
          setStep("review");
        }
      }
    }, 800);
  }, [selectedCoin, numAmount, address, coinConfig, coinData, executeSend]);

  const stepCount = preselectedCoin ? 3 : 4;
  const currentStep = step === "select" ? 0 : step === "address" ? 1 : step === "amount" ? 2 : 3;

  return (
    <>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modalSheet}>
        <div className={styles.handle} />
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Send</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {step !== "processing" && step !== "success" && (
          <div className={styles.stepIndicator}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <div key={i} className={`${styles.stepDot} ${i === currentStep ? styles.stepDotActive : ""} ${i < currentStep ? styles.stepDotCompleted : ""}`} />
            ))}
          </div>
        )}

        {/* Select Coin */}
        {step === "select" && (
          <>
            <input className={styles.searchInput} placeholder="Search coins..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className={`${styles.coinSelect} ${styles.scrollList}`}>
              {filteredCoins.map(coin => {
                const data = marketData.find(c => c.id === coin.id);
                return (
                  <button key={coin.id} className={styles.coinOption} onClick={() => handleSelectCoin(coin.id)}>
                    {data && <img src={data.image} alt={coin.name} className={styles.coinOptionIcon} />}
                    <div className={styles.coinOptionInfo}>
                      <div className={styles.coinOptionName}>{coin.name}</div>
                      <div className={styles.coinOptionBalance}>
                        {formatCoinAmount(balances[coin.id] || 0, coin.symbol)} · {formatCurrency((balances[coin.id] || 0) * (data?.current_price || 0))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Address */}
        {step === "address" && (
          <div className={styles.addressSection}>
            <div className={styles.addressLabel}>Recipient Address</div>
            <input className="input-field" placeholder="Enter wallet address" value={address} onChange={e => { setAddress(e.target.value); setError(""); }} />
            {error && <p style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)", marginTop: 8 }}>{error}</p>}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-full" onClick={handleAddressNext}>Continue</button>
            </div>
          </div>
        )}

        {/* Amount */}
        {step === "amount" && (
          <div className={styles.amountSection}>
            <div className={styles.amountLabel}>Amount ({coinConfig?.symbol})</div>
            <div className={styles.amountInputRow}>
              <input className={styles.amountInput} type="number" placeholder="0.00" value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} />
              <button className={styles.maxBtn} onClick={() => setAmount(String(Math.max(0, balance - fee)))}>MAX</button>
            </div>
            <div className={styles.amountFiat}>≈ {formatCurrency(fiatValue)}</div>
            <div className={styles.amountFiat}>Balance: {formatCoinAmount(balance, coinConfig?.symbol || "")}</div>
            {error && <p style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)", marginTop: 8 }}>{error}</p>}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-full" onClick={handleAmountNext}>Review</button>
            </div>
          </div>
        )}

        {/* Review */}
        {step === "review" && (
          <>
            <div className={styles.reviewSection}>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Asset</span>
                <span className={styles.reviewValue}>{coinConfig?.name}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Amount</span>
                <span className={styles.reviewValue}>{formatCoinAmount(numAmount, coinConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>To</span>
                <span className={styles.reviewValue} style={{ fontSize: "var(--font-xs)", maxWidth: 180, wordBreak: "break-all" }}>{address}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Network Fee</span>
                <span className={styles.reviewValue}>{formatCoinAmount(fee, coinConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Total</span>
                <span className={styles.reviewTotal}>{formatCurrency(fiatValue)}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleConfirm}>Confirm Send</button>
          </>
        )}

        {/* Processing */}
        {step === "processing" && (
          <div className={styles.processingContainer}>
            <div className={styles.processingSpinner} />
            <div className={styles.processingSteps}>
              {["Validating address...", "Preparing transaction...", "Broadcasting to network...", "Confirming..."].map((text, i) => (
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

        {/* Success */}
        {step === "success" && (
          <div className={styles.successContainer}>
            <div className={styles.successIcon}><Check size={32} /></div>
            <h3 className={styles.successTitle}>Sent Successfully!</h3>
            <div className={styles.successAmount}>{formatCoinAmount(numAmount, coinConfig?.symbol || "")}</div>
            <p className={styles.successDetail}>≈ {formatCurrency(fiatValue)}</p>
            <button className="btn btn-primary btn-full" onClick={onClose} style={{ marginTop: 16 }}>Done</button>
          </div>
        )}
      </div>
    </>
  );
}
