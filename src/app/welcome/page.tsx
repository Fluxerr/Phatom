"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import { generateSeedPhrase } from "@/lib/utils/crypto";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./welcome.module.css";

type Screen = "welcome" | "create" | "seed" | "verify" | "pin" | "success" | "import";

export default function WelcomePage() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"create" | "confirm">("create");
  const [verifyWords, setVerifyWords] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});
  const [importPhrase, setImportPhrase] = useState("");
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);

  const router = useRouter();
  const completeOnboarding = useAuthStore(s => s.completeOnboarding);
  const initializeWallet = useWalletStore(s => s.initializeWallet);

  const handleCreateWallet = useCallback(() => {
    const phrase = generateSeedPhrase();
    setSeedPhrase(phrase);
    // Pick 3 random indices to verify
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 12);
      if (!indices.includes(idx)) indices.push(idx);
    }
    setVerifyWords(indices.sort((a, b) => a - b));
    setScreen("seed");
  }, []);

  const handleVerifySeed = useCallback(() => {
    for (const idx of verifyWords) {
      if (verifyInputs[idx]?.toLowerCase().trim() !== seedPhrase[idx]) {
        setError("Words don't match. Please try again.");
        return;
      }
    }
    setError("");
    setScreen("pin");
  }, [verifyWords, verifyInputs, seedPhrase]);

  const handlePinPress = useCallback((digit: string) => {
    setError("");
    if (pinStep === "create") {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => {
          setPinStep("confirm");
        }, 200);
      }
    } else {
      const newConfirm = confirmPin + digit;
      setConfirmPin(newConfirm);
      if (newConfirm.length === 6) {
        if (newConfirm === pin) {
          finishSetup(pin, seedPhrase);
        } else {
          setError("PINs don't match. Try again.");
          setTimeout(() => {
            setConfirmPin("");
            setPinStep("create");
            setPin("");
          }, 800);
        }
      }
    }
  }, [pin, confirmPin, pinStep, seedPhrase]);

  const handlePinDelete = useCallback(() => {
    if (pinStep === "create") {
      setPin(p => p.slice(0, -1));
    } else {
      setConfirmPin(p => p.slice(0, -1));
    }
  }, [pinStep]);

  const handleImport = useCallback(() => {
    const words = importPhrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError("Please enter 12 or 24 words");
      return;
    }
    setSeedPhrase(words.slice(0, 12));
    setError("");
    setScreen("pin");
  }, [importPhrase]);

  const finishSetup = useCallback((finalPin: string, phrase: string[]) => {
    setScreen("success");
    setAnimating(true);
    setTimeout(() => {
      completeOnboarding(finalPin, phrase);
      initializeWallet();
      router.push("/wallet");
    }, 2000);
  }, [completeOnboarding, initializeWallet, router]);

  const currentPinValue = pinStep === "create" ? pin : confirmPin;

  return (
    <div className={styles.container}>
      {/* Welcome Screen */}
      {screen === "welcome" && (
        <div className={styles.screen}>
          <div className={styles.heroSection}>
            <div className={styles.logoContainer}>
              <div className={styles.logo}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <defs>
                    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#AB9FF2" />
                      <stop offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" rx="16" fill="url(#logoGrad)" />
                  <path d="M20 44V24C20 20 24 16 28 16H36C40 16 44 20 44 24V32C44 40 36 44 32 44C28 44 20 44 20 44Z" fill="white" fillOpacity="0.9"/>
                  <circle cx="30" cy="28" r="3" fill="#6D28D9"/>
                  <circle cx="38" cy="28" r="3" fill="#6D28D9"/>
                </svg>
              </div>
              <div className={styles.logoGlow} />
            </div>
            <h1 className={styles.title}>Phantom</h1>
            <p className={styles.subtitle}>A crypto wallet reimagined for the multichain world</p>
          </div>
          <div className={styles.actions}>
            <button className="btn btn-primary btn-lg btn-full" onClick={handleCreateWallet}>
              Create New Wallet
            </button>
            <button className="btn btn-secondary btn-lg btn-full" onClick={() => setScreen("import")}>
              Import Existing Wallet
            </button>
          </div>
        </div>
      )}

      {/* Seed Phrase Display */}
      {screen === "seed" && (
        <div className={styles.screen}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => setScreen("welcome")}>
              ← Back
            </button>
            <h2 className={styles.screenTitle}>Your Secret Phrase</h2>
            <p className={styles.screenDesc}>
              Write down these 12 words in order and keep them safe. This is the only way to recover your wallet.
            </p>
          </div>
          <div className={styles.seedGrid}>
            {seedPhrase.map((word, i) => (
              <div key={i} className={styles.seedWord} style={{ animationDelay: `${i * 80}ms` }}>
                <span className={styles.seedIndex}>{i + 1}</span>
                <span className={styles.seedText}>{word}</span>
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <button className="btn btn-primary btn-lg btn-full" onClick={() => setScreen("verify")}>
              I&apos;ve Saved My Phrase
            </button>
          </div>
        </div>
      )}

      {/* Verify Seed Phrase */}
      {screen === "verify" && (
        <div className={styles.screen}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => setScreen("seed")}>
              ← Back
            </button>
            <h2 className={styles.screenTitle}>Verify Phrase</h2>
            <p className={styles.screenDesc}>
              Enter the following words from your secret phrase to verify.
            </p>
          </div>
          <div className={styles.verifySection}>
            {verifyWords.map(idx => (
              <div key={idx} className={styles.verifyRow}>
                <label className={styles.verifyLabel}>Word #{idx + 1}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={`Enter word #${idx + 1}`}
                  value={verifyInputs[idx] || ""}
                  onChange={e => setVerifyInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            ))}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button className="btn btn-primary btn-lg btn-full" onClick={handleVerifySeed}>
              Verify
            </button>
          </div>
        </div>
      )}

      {/* Import Wallet */}
      {screen === "import" && (
        <div className={styles.screen}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => setScreen("welcome")}>
              ← Back
            </button>
            <h2 className={styles.screenTitle}>Import Wallet</h2>
            <p className={styles.screenDesc}>
              Enter your 12 or 24 word secret recovery phrase.
            </p>
          </div>
          <div className={styles.importSection}>
            <textarea
              className={styles.importTextarea}
              placeholder="Enter your secret phrase, separated by spaces..."
              value={importPhrase}
              onChange={e => setImportPhrase(e.target.value)}
              rows={4}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button className="btn btn-primary btn-lg btn-full" onClick={handleImport}>
              Import
            </button>
          </div>
        </div>
      )}

      {/* PIN Setup */}
      {screen === "pin" && (
        <div className={styles.screen}>
          <div className={styles.header}>
            <h2 className={styles.screenTitle}>
              {pinStep === "create" ? "Create PIN" : "Confirm PIN"}
            </h2>
            <p className={styles.screenDesc}>
              {pinStep === "create"
                ? "Set a 6-digit PIN to secure your wallet"
                : "Enter your PIN again to confirm"}
            </p>
          </div>
          <div className={styles.pinDots}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.pinDot} ${i < currentPinValue.length ? styles.pinDotFilled : ""}`}
              />
            ))}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.numpad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((key, i) => (
              <button
                key={i}
                className={`${styles.numpadKey} ${key === null ? styles.numpadEmpty : ""}`}
                onClick={() => {
                  if (key === "del") handlePinDelete();
                  else if (key !== null) handlePinPress(String(key));
                }}
                disabled={key === null}
              >
                {key === "del" ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                    <line x1="18" y1="9" x2="12" y2="15"/>
                    <line x1="12" y1="9" x2="18" y2="15"/>
                  </svg>
                ) : key !== null ? (
                  key
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success */}
      {screen === "success" && (
        <div className={styles.screen}>
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="#10B981" strokeWidth="3" fill="rgba(16,185,129,0.1)"/>
                <path
                  d="M25 40L35 50L55 30"
                  stroke="#10B981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={animating ? styles.checkmark : ""}
                />
              </svg>
            </div>
            <h2 className={styles.successTitle}>Wallet Created!</h2>
            <p className={styles.successDesc}>Your wallet is ready. Taking you to your dashboard...</p>
            <div className={styles.successSpinner}>
              <div className={styles.spinner} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
