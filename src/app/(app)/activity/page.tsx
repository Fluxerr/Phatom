"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus, ExternalLink, Clock } from "lucide-react";
import { useWalletStore, Transaction } from "@/lib/store/walletStore";
import { formatCurrency, formatCoinAmount, formatAddress } from "@/lib/utils/format";
import styles from "./activity.module.css";

export default function ActivityPage() {
  const { transactions } = useWalletStore();
  const [filter, setFilter] = useState<"all" | "send" | "receive" | "swap">("all");

  const filteredTx = transactions.filter(tx => {
    if (filter === "all") return true;
    if (filter === "send" && tx.type === "send") return true;
    if (filter === "receive" && (tx.type === "receive" || tx.type === "deposit")) return true;
    if (filter === "swap" && tx.type === "swap") return true;
    return false;
  });

  const getTxIcon = (type: string) => {
    switch (type) {
      case "send": return <div className={`${styles.iconWrap} ${styles.iconSend}`}><ArrowUpRight size={16} /></div>;
      case "receive":
      case "deposit": return <div className={`${styles.iconWrap} ${styles.iconReceive}`}><ArrowDownLeft size={16} /></div>;
      case "swap": return <div className={`${styles.iconWrap} ${styles.iconSwap}`}><ArrowLeftRight size={16} /></div>;
      default: return <div className={styles.iconWrap}><Clock size={16} /></div>;
    }
  };

  const getTxTitle = (tx: Transaction) => {
    switch (tx.type) {
      case "send": return `Sent ${tx.coinSymbol}`;
      case "receive": return `Received ${tx.coinSymbol}`;
      case "deposit": return `Deposited ${tx.coinSymbol}`;
      case "swap": return `Swapped ${tx.coinSymbol} for ${tx.toCoinSymbol}`;
      default: return "Transaction";
    }
  };

  const getTxStatus = (status: string, confs: number, reqConfs: number) => {
    if (status === "confirmed") return <span className={styles.statusSuccess}>Completed</span>;
    if (status === "failed") return <span className={styles.statusFailed}>Failed</span>;
    return <span className={styles.statusPending}>Pending ({confs}/{reqConfs})</span>;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Activity</h1>
      </div>

      <div className={styles.filters}>
        <button className={`chip ${filter === "all" ? "chip-active" : ""}`} onClick={() => setFilter("all")}>All</button>
        <button className={`chip ${filter === "send" ? "chip-active" : ""}`} onClick={() => setFilter("send")}>Sent</button>
        <button className={`chip ${filter === "receive" ? "chip-active" : ""}`} onClick={() => setFilter("receive")}>Received</button>
        <button className={`chip ${filter === "swap" ? "chip-active" : ""}`} onClick={() => setFilter("swap")}>Swaps</button>
      </div>

      <div className={styles.list}>
        {filteredTx.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Clock size={32} /></div>
            <h3>No Activity Yet</h3>
            <p>Your transactions will appear here</p>
          </div>
        ) : (
          filteredTx.map(tx => (
            <div key={tx.id} className={styles.txCard}>
              <div className={styles.txHeader}>
                <div className={styles.txTitleGroup}>
                  {getTxIcon(tx.type)}
                  <div>
                    <div className={styles.txTitle}>{getTxTitle(tx)}</div>
                    <div className={styles.txTime}>{new Date(tx.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <div className={styles.txAmountGroup}>
                  <div className={styles.txAmount}>
                    {tx.type === "send" ? "-" : tx.type === "receive" || tx.type === "deposit" ? "+" : ""}
                    {formatCoinAmount(tx.amount, tx.coinSymbol)}
                  </div>
                  <div className={styles.txFiat}>{formatCurrency(tx.fiatValue)}</div>
                </div>
              </div>

              <div className={styles.txDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span>{getTxStatus(tx.status, tx.confirmations, tx.requiredConfirmations)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{tx.type === "send" ? "To" : "From"}</span>
                  <span className={styles.address}>{formatAddress(tx.type === "send" ? tx.toAddress : tx.fromAddress)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Network Fee</span>
                  <span>{tx.fee > 0 ? formatCoinAmount(tx.fee, tx.coinSymbol) : "Free"}</span>
                </div>
                <button className={styles.explorerBtn}>
                  View on Explorer <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
