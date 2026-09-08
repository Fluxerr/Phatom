"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Wallet, BarChart3, ArrowLeftRight, Clock, Settings } from "lucide-react";
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

  return (
    <>
      <div className={styles.content}>
        {children}
      </div>
      <nav className={`tab-bar glass ${styles.tabBar}`}>
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tab-item ${isActive ? "tab-item-active" : ""} ${styles.tabLink}`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? styles.tabIconActive : styles.tabIcon}
              />
              <span className="tab-item-label">{tab.label}</span>
              {isActive && <div className={styles.activeIndicator} />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
