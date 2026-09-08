"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { useWalletStore } from "@/lib/store/walletStore";
import { NETWORKS } from "@/lib/utils/constants";
import { formatAddress } from "@/lib/utils/format";
import styles from "./modal.module.css";

interface Props {
  onClose: () => void;
}

export default function ReceiveModal({ onClose }: Props) {
  const { getAddress } = useWalletStore();
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [copied, setCopied] = useState(false);

  const address = selectedNetwork ? getAddress(selectedNetwork) : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modalSheet}>
        <div className={styles.handle} />
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Receive</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {!selectedNetwork ? (
          <>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginBottom: 16 }}>
              Select a network to receive funds
            </p>
            <div className={styles.networkList}>
              {NETWORKS.map(net => (
                <button
                  key={net.id}
                  className={styles.networkOption}
                  onClick={() => setSelectedNetwork(net.id)}
                >
                  <div className={styles.networkDot} />
                  <span className={styles.networkName}>{net.name}</span>
                  <span className={styles.networkSymbol}>{net.symbol}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.qrSection}>
            {/* QR Code placeholder */}
            <div className={styles.qrPlaceholder}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                {/* Simple QR-like pattern */}
                <rect width="160" height="160" fill="white" />
                {Array.from({ length: 20 }).map((_, row) => 
                  Array.from({ length: 20 }).map((_, col) => {
                    const isFilled = (
                      (row < 7 && col < 7) ||
                      (row < 7 && col > 12) ||
                      (row > 12 && col < 7) ||
                      Math.random() > 0.5
                    );
                    return isFilled ? (
                      <rect key={`${row}-${col}`} x={col * 8} y={row * 8} width="8" height="8" fill="black" />
                    ) : null;
                  })
                )}
              </svg>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", textAlign: "center" }}>
              Send only {NETWORKS.find(n => n.id === selectedNetwork)?.name} assets to this address
            </p>

            <div className={styles.addressDisplay}>
              <span style={{ flex: 1 }}>{formatAddress(address, 12)}</span>
              <button className={styles.copyBtn} onClick={handleCopy}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>

            <button
              className="btn btn-secondary btn-full"
              onClick={() => setSelectedNetwork("")}
              style={{ marginTop: 8 }}
            >
              Change Network
            </button>
          </div>
        )}
      </div>
    </>
  );
}
