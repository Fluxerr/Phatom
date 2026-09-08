import { FIAT_CURRENCIES } from "./constants";

export function formatCurrency(
  value: number,
  currency: string = "usd",
  compact: boolean = false
): string {
  const fiat = FIAT_CURRENCIES.find(f => f.code === currency) || FIAT_CURRENCIES[0];
  
  if (compact && Math.abs(value) >= 1_000_000_000) {
    return `${fiat.symbol}${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${fiat.symbol}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `${fiat.symbol}${(value / 1_000).toFixed(2)}K`;
  }

  if (value >= 1) {
    return `${fiat.symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (value >= 0.01) {
    return `${fiat.symbol}${value.toFixed(4)}`;
  }
  if (value >= 0.0001) {
    return `${fiat.symbol}${value.toFixed(6)}`;
  }
  return `${fiat.symbol}${value.toFixed(8)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCoinAmount(amount: number, symbol: string): string {
  if (amount >= 1000) {
    return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${symbol}`;
  }
  if (amount >= 1) {
    return `${amount.toFixed(4)} ${symbol}`;
  }
  if (amount >= 0.001) {
    return `${amount.toFixed(6)} ${symbol}`;
  }
  return `${amount.toFixed(8)} ${symbol}`;
}

export function formatAddress(address: string, chars: number = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatDate(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | number): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function timeAgo(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(d);
}

export function groupByDate<T>(items: T[], getDate: (item: T) => number): { label: string; items: T[] }[] {
  const groups: Map<string, T[]> = new Map();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 7 * 86400000;

  items.forEach(item => {
    const timestamp = getDate(item);
    let label: string;
    if (timestamp >= today) label = "Today";
    else if (timestamp >= yesterday) label = "Yesterday";
    else if (timestamp >= thisWeek) label = "This Week";
    else label = formatDate(timestamp);

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}
