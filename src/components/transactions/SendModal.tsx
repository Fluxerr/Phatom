"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Check, Loader2, ArrowLeftRight, Zap } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { useAuthStore } from "@/lib/store/authStore";
import { SUPPORTED_COINS } from "@/lib/utils/constants";
import { formatCurrency, formatCoinAmount } from "@/lib/utils/format";
import { CoinMarketData } from "@/lib/api/coingecko";
import { lookupAddress } from "@/lib/store/transferStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import styles from "./modal.module.css";

interface Props {
  marketData: CoinMarketData[];
  onClose: () => void;
  preselectedCoin?: string | null;
}

type Step = "select" | "address" | "amount" | "review" | "processing" | "success";

export default function SendModal({ marketData, onClose, preselectedCoin }: Props) {
  const { balances, executeSend } = useWalletStore();
  const { walletId } = useAuthStore();
  const [step, setStep] = useState<Step>(preselectedCoin ? "address" : "select");
  const [selectedCoin, setSelectedCoin] = useState(preselectedCoin || "");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState("");
  const [isFiat, setIsFiat] = useState(false);
  const [isInternalTransfer, setIsInternalTransfer] = useState(false);
  const [recipientName, setRecipientName] = useState("");

  const coinData = marketData.find(c => c.id === selectedCoin);
  const coinConfig = SUPPORTED_COINS.find(c => c.id === selectedCoin);
  const balance = balances[selectedCoin] || 0;
  const numInput = parseFloat(amount) || 0;
  const currentPrice = coinData?.current_price || 1;
  const coinAmount = isFiat ? numInput / currentPrice : numInput;
  const fiatValue = isFiat ? numInput : numInput * currentPrice;
  const fee = coinAmount * 0.001;

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

  // Check if address belongs to another user
  const checkAddress = useCallback(async (addr: string) => {
    if (!isSupabaseConfigured() || addr.length < 10) {
      setIsInternalTransfer(false);
      setRecipientName("");
      return;
    }

    try {
      const recipient = await lookupAddress(addr);
      if (recipient && recipient.wallet_id !== walletId) {
        setIsInternalTransfer(true);
        setRecipientName(recipient.wallet_name);
      } else {
        setIsInternalTransfer(false);
        setRecipientName("");
      }
    } catch {
      setIsInternalTransfer(false);
    }
  }, [walletId]);

  // Debounced address lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (address.length >= 10) {
        checkAddress(address);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [address, checkAddress]);

  const handleAddressNext = () => {
    if (address.length < 10) {
      setError("Please enter a valid address");
      return;
    }
    setError("");
    setStep("amount");
  };

  const handleAmountNext = () => {
    if (coinAmount <= 0) {
      setError("Enter an amount");
      return;
    }
    if (coinAmount + fee > balance) {
      setError("Insufficient balance");
      return;
    }
    setError("");
    setStep("review");
  };

  const handleConfirm = useCallback(() => {
    setStep("processing");

    const isInternal = isInternalTransfer;
    const steps = isInternal
      ? ["Verifying recipient...", "Processing transfer...", "Confirming..."]
      : ["Validating address...", "Preparing transaction...", "Broadcasting to network...", "Confirming..."];

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setProcessStep(i);
      if (i >= steps.length) {
        clearInterval(interval);
        (async () => {
          try {
            await executeSend(
              selectedCoin,
              coinAmount,
              address,
              coinConfig?.networks[0] || "ethereum",
              coinData?.current_price || 0
            );
            setTimeout(() => setStep("success"), 500);
          } catch {
            setError("Transaction failed");
            setStep("review");
          }
        })();
      }
    }, isInternal ? 600 : 800);
  }, [selectedCoin, coinAmount, address, coinConfig, coinData, executeSend, isInternalTransfer]);

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
            {isInternalTransfer && (
              <div className={styles.internalBadge}>
                <Zap size={12} /> Phantom User: {recipientName} — Instant Transfer
              </div>
            )}
            {error && <p style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)", marginTop: 8 }}>{error}</p>}
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-full" onClick={handleAddressNext}>Continue</button>
            </div>
          </div>
        )}

        {/* Amount */}
        {step === "amount" && (
          <div className={styles.amountSection}>
            <div className={styles.amountLabel}>Send Amount</div>
            <div className={styles.amountInputRow}>
              {isFiat && <div className={styles.amountPrefix}>$</div>}
              <input className={styles.amountInput} type="number" placeholder="0.00" value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} />
              <button className={styles.toggleFiatBtn} onClick={() => setIsFiat(!isFiat)}>
                <ArrowLeftRight size={14} />
                {isFiat ? "USD" : coinConfig?.symbol}
              </button>
            </div>
            <div className={styles.amountFiat}>≈ {isFiat ? formatCoinAmount(coinAmount, coinConfig?.symbol || "") : formatCurrency(fiatValue)}</div>
            {error && <div className={styles.errorText}>{error}</div>}
            
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginBottom: 16 }}>
                <span>Available</span>
                <span>{formatCoinAmount(balance, coinConfig?.symbol || "")}</span>
              </div>
              <button className="btn btn-primary btn-full btn-lg" onClick={handleAmountNext}>
                Review Send
              </button>
            </div>
          </div>
        )}

        {/* Review */}
        {step === "review" && (
          <>
            <div className={styles.reviewSection}>
              {isInternalTransfer && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "var(--space-3)", background: "var(--color-success-dim)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-3)" }}>
                  <Zap size={14} style={{ color: "var(--color-success)" }} />
                  <span style={{ fontSize: "var(--font-sm)", color: "var(--color-success)", fontWeight: 600 }}>Instant P2P Transfer to {recipientName}</span>
                </div>
              )}
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Asset</span>
                <span className={styles.reviewValue}>{coinConfig?.name}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Amount</span>
                <span className={styles.reviewValue}>{formatCoinAmount(coinAmount, coinConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Network Fee</span>
                <span className={styles.reviewValue}>{formatCoinAmount(fee, coinConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Total</span>
                <span className={styles.reviewValue}>{formatCoinAmount(coinAmount + fee, coinConfig?.symbol || "")}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Value</span>
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
              {(isInternalTransfer
                ? ["Verifying recipient...", "Processing transfer...", "Confirming..."]
                : ["Validating address...", "Preparing transaction...", "Broadcasting to network...", "Confirming..."]
              ).map((text, i) => (
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
            <h3 className={styles.successTitle}>
              {isInternalTransfer ? "Transfer Complete!" : "Sent Successfully!"}
            </h3>
            <div className={styles.successAmount}>-{formatCoinAmount(coinAmount, coinConfig?.symbol || "")}</div>
            <p className={styles.successDetail}>≈ {formatCurrency(fiatValue)}</p>
            {isInternalTransfer && (
              <p style={{ fontSize: "var(--font-sm)", color: "var(--color-success)" }}>
                Instantly transferred to {recipientName}
              </p>
            )}
            <button className="btn btn-primary btn-full" onClick={onClose} style={{ marginTop: 16 }}>Done</button>
          </div>
        )}
      </div>
    </>
  );
}
