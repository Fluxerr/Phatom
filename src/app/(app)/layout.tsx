"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Wallet, BarChart3, ArrowLeftRight, Clock, Settings } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import { useToast } from "@/components/Toast";
import { isSupabaseConfigured } from "@/lib/supabase";
import { subscribeToTransfers } from "@/lib/store/transferStore";
import { generateWalletId } from "@/lib/utils/crypto";
import styles from "./appLayout.module.css";

const tabs = [
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/market", label: "Market", icon: BarChart3 },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/activity", label: "Activity", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { walletId, walletName, isOnboarded } = useAuthStore();
  const { checkIncomingTransfers, registerWalletAddresses } = useWalletStore();
  const { showToast } = useToast();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Register addresses with Supabase on mount (and auto-assign walletId to legacy accounts)
  useEffect(() => {
    let id = walletId;
    if (isOnboarded && !id) {
      id = generateWalletId();
      useAuthStore.setState({ walletId: id });
    }
    if (id && isSupabaseConfigured()) {
      registerWalletAddresses(id, walletName);
    }
  }, [isOnboarded, walletId, walletName, registerWalletAddresses]);

  // Poll for incoming transfers
  const pollTransfers = useCallback(async () => {
    if (!walletId || !isSupabaseConfigured()) return;
    
    try {
      const claimed = await checkIncomingTransfers(walletId);
      for (const tx of claimed) {
        showToast(`Received ${tx.amount.toFixed(6)} ${tx.coinSymbol}!`, "success");
      }
    } catch (err) {
      console.error("Transfer poll error:", err);
    }
  }, [walletId, checkIncomingTransfers, showToast]);

  useEffect(() => {
    pollTransfers(); // Check immediately on mount
    pollRef.current = setInterval(pollTransfers, 3000); // Fast poll every 3s as backup

    // Realtime WebSocket subscription for instant sub-second updates
    let sub: { unsubscribe: () => void } | null = null;
    if (walletId && isSupabaseConfigured()) {
      sub = subscribeToTransfers(walletId, () => {
        pollTransfers(); // Trigger instant claim & toast when event arrives
      });
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (sub) sub.unsubscribe();
    };
  }, [walletId, pollTransfers]);

  return (
    <>
      <div key={pathname} className={styles.content}>
        {children}
      </div>
      <nav className={`${styles.tabBar} glass`}>
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tabLink} ${isActive ? styles.tabLinkActive : ""}`}
            >
              <div className={`${styles.tabIconWrap} ${isActive ? styles.tabIconWrapActive : ""}`}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span className={styles.tabLabel}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
