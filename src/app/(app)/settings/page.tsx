"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, Bell, Fingerprint, Palette, DollarSign, LogOut, ChevronRight, AlertTriangle } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const router = useRouter();
  const { currency, theme, autoLockMinutes, biometricEnabled, notifications, setCurrency, setTheme, setAutoLock, setBiometric, setNotifications } = useSettingsStore();
  const { walletName, pin, seedPhrase, resetWallet: resetAuth } = useAuthStore();
  const { resetWallet } = useWalletStore();

  const [showSeed, setShowSeed] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handleRevealSeed = () => {
    if (pinInput === pin) {
      setShowSeed(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN");
      setTimeout(() => setPinError(""), 2000);
    }
    setPinInput("");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your wallet? This will delete all local data. Make sure you have backed up your seed phrase.")) {
      resetAuth();
      resetWallet();
      router.replace("/");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.container}>
        {/* Profile */}
        <div className={styles.profileSection}>
          <div className={styles.avatarLarge}>P</div>
          <div className={styles.profileInfo}>
            <h2 className={styles.profileName}>{walletName}</h2>
            <span className={styles.profileStatus}>Secured</span>
          </div>
        </div>

        {/* Preferences */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Preferences</h3>
          <div className={styles.listCard}>
            <div className={styles.listItem}>
              <div className={styles.itemIcon}><DollarSign size={18} /></div>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>Currency</div>
                <div className={styles.itemSub}>Display values in {currency.toUpperCase()}</div>
              </div>
              <select className={styles.select} value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
              </select>
            </div>
            
            <div className={styles.listItem}>
              <div className={styles.itemIcon}><Palette size={18} /></div>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>Theme</div>
                <div className={styles.itemSub}>App appearance</div>
              </div>
              <select className={styles.select} value={theme} onChange={e => setTheme(e.target.value as "dark"|"light")}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className={styles.listItem}>
              <div className={styles.itemIcon}><Bell size={18} /></div>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>Notifications</div>
                <div className={styles.itemSub}>Alerts for transactions</div>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} />
                <span className={styles.slider}></span>
              </label>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Security</h3>
          <div className={styles.listCard}>
            <div className={styles.listItem}>
              <div className={styles.itemIcon}><Shield size={18} /></div>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>Auto-Lock</div>
                <div className={styles.itemSub}>Require PIN after {autoLockMinutes} min</div>
              </div>
              <select className={styles.select} value={autoLockMinutes} onChange={e => setAutoLock(Number(e.target.value))}>
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            <div className={styles.listItem}>
              <div className={styles.itemIcon}><Fingerprint size={18} /></div>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>Biometrics</div>
                <div className={styles.itemSub}>Use Face ID / Touch ID</div>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={biometricEnabled} onChange={e => setBiometric(e.target.checked)} />
                <span className={styles.slider}></span>
              </label>
            </div>

            <div className={styles.listItem} style={{ cursor: "pointer" }} onClick={() => { if (!showSeed) setShowPinModal(true); }}>
              <div className={styles.itemIcon}><Key size={18} /></div>
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>Show Secret Phrase</div>
                <div className={styles.itemSub}>Reveal your recovery phrase</div>
              </div>
              <ChevronRight size={18} color="var(--text-tertiary)" />
            </div>
          </div>
        </div>

        {showPinModal && !showSeed && (
          <div className={styles.seedSection} style={{ border: "1px solid var(--border-primary)" }}>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "var(--font-sm)" }}>Enter Wallet PIN to Reveal</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input 
                type="password"
                maxLength={4}
                className={styles.select}
                style={{ width: "100%", padding: "10px", textAlign: "center", letterSpacing: "8px", fontSize: "18px" }}
                placeholder="••••"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleRevealSeed}>Verify</button>
            </div>
            {pinError && <p style={{ color: "var(--color-danger)", fontSize: "var(--font-xs)", marginBottom: 8 }}>{pinError}</p>}
            <button className="btn btn-ghost btn-full" onClick={() => { setShowPinModal(false); setPinInput(""); setPinError(""); }}>Cancel</button>
          </div>
        )}

        {showSeed && seedPhrase && (
          <div className={styles.seedSection}>
            <div className={styles.seedWarning}>
              <AlertTriangle size={16} />
              Never share these words with anyone.
            </div>
            <div className={styles.seedGrid}>
              {seedPhrase.map((word, i) => (
                <div key={i} className={styles.seedWord}>
                  <span className={styles.seedNum}>{i + 1}</span>
                  {word}
                </div>
              ))}
            </div>
            <button className="btn btn-secondary btn-full" onClick={() => setShowSeed(false)} style={{ marginTop: 16 }}>
              Hide Phrase
            </button>
          </div>
        )}

        {/* Danger Zone */}
        <div className={styles.section} style={{ marginTop: 32 }}>
          <button className={styles.resetBtn} onClick={handleReset}>
            <LogOut size={18} />
            Reset Wallet
          </button>
          <p style={{ textAlign: "center", fontSize: "var(--font-xs)", color: "var(--text-muted)", marginTop: 12 }}>
            Phantom Version 1.0.0
          </p>
        </div>

      </div>
    </div>
  );
}
