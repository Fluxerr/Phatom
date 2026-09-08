// Default coins the wallet supports
// Major coins get starting balances, others start at 0
export interface CoinConfig {
  id: string;         // CoinGecko ID
  symbol: string;
  name: string;
  isMajor: boolean;   // Major coins included by default
  swappable: boolean; // Can be swapped
  networks: string[];
}

export const SUPPORTED_COINS: CoinConfig[] = [
  // Major coins (will get starting balances)
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", isMajor: true, swappable: true, networks: ["bitcoin"] },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", isMajor: true, swappable: true, networks: ["ethereum"] },
  { id: "solana", symbol: "SOL", name: "Solana", isMajor: true, swappable: true, networks: ["solana"] },
  { id: "binancecoin", symbol: "BNB", name: "BNB", isMajor: true, swappable: true, networks: ["bsc"] },
  { id: "ripple", symbol: "XRP", name: "XRP", isMajor: true, swappable: true, networks: ["xrp"] },
  { id: "cardano", symbol: "ADA", name: "Cardano", isMajor: true, swappable: true, networks: ["cardano"] },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", isMajor: true, swappable: true, networks: ["dogecoin"] },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", isMajor: true, swappable: true, networks: ["polkadot"] },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", isMajor: true, swappable: true, networks: ["avalanche"] },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", isMajor: true, swappable: true, networks: ["ethereum"] },

  // Secondary coins (start at 0 balance but can be bought/swapped)
  { id: "tron", symbol: "TRX", name: "TRON", isMajor: false, swappable: true, networks: ["tron"] },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", isMajor: false, swappable: true, networks: ["litecoin"] },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon", isMajor: false, swappable: true, networks: ["polygon"] },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", isMajor: false, swappable: true, networks: ["ethereum"] },
  { id: "stellar", symbol: "XLM", name: "Stellar", isMajor: false, swappable: true, networks: ["stellar"] },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", isMajor: false, swappable: true, networks: ["cosmos"] },
  { id: "filecoin", symbol: "FIL", name: "Filecoin", isMajor: false, swappable: true, networks: ["filecoin"] },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", isMajor: false, swappable: true, networks: ["near"] },
  { id: "aptos", symbol: "APT", name: "Aptos", isMajor: false, swappable: true, networks: ["aptos"] },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer", isMajor: false, swappable: true, networks: ["icp"] },
  { id: "render-token", symbol: "RENDER", name: "Render", isMajor: false, swappable: true, networks: ["ethereum"] },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", isMajor: false, swappable: true, networks: ["arbitrum"] },
  { id: "optimism", symbol: "OP", name: "Optimism", isMajor: false, swappable: true, networks: ["optimism"] },
  { id: "injective-protocol", symbol: "INJ", name: "Injective", isMajor: false, swappable: true, networks: ["injective"] },
  { id: "aave", symbol: "AAVE", name: "Aave", isMajor: false, swappable: true, networks: ["ethereum"] },
  { id: "the-graph", symbol: "GRT", name: "The Graph", isMajor: false, swappable: true, networks: ["ethereum"] },
  { id: "pepe", symbol: "PEPE", name: "Pepe", isMajor: false, swappable: true, networks: ["ethereum"] },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", isMajor: false, swappable: true, networks: ["ethereum"] },
  { id: "bonk", symbol: "BONK", name: "Bonk", isMajor: false, swappable: true, networks: ["solana"] },
  { id: "sui", symbol: "SUI", name: "Sui", isMajor: false, swappable: true, networks: ["sui"] },

  // Stablecoins (swappable with everything)
  { id: "tether", symbol: "USDT", name: "Tether", isMajor: false, swappable: true, networks: ["ethereum", "bsc", "tron", "solana"] },
  { id: "usd-coin", symbol: "USDC", name: "USD Coin", isMajor: false, swappable: true, networks: ["ethereum", "bsc", "solana", "polygon"] },
  { id: "dai", symbol: "DAI", name: "Dai", isMajor: false, swappable: true, networks: ["ethereum"] },
];

// Swap pairs — defines which coins can be swapped with each other
// In reality, most ERC-20 tokens can swap with ETH, SOL tokens with SOL, etc.
export const SWAP_NETWORKS: Record<string, string[]> = {
  ethereum: ["ethereum", "chainlink", "uniswap", "aave", "the-graph", "render-token", "pepe", "shiba-inu", "tether", "usd-coin", "dai", "arbitrum", "optimism"],
  solana: ["solana", "bonk", "tether", "usd-coin"],
  bsc: ["binancecoin", "tether", "usd-coin"],
  // Cross-chain swaps (simulated via bridge)
  cross: ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano", "dogecoin", "polkadot", "avalanche-2", "tron", "litecoin", "stellar", "cosmos", "near", "aptos", "sui", "filecoin", "internet-computer", "injective-protocol"],
};

export function canSwap(fromId: string, toId: string): boolean {
  if (fromId === toId) return false;
  // Check if they share a network
  for (const network of Object.values(SWAP_NETWORKS)) {
    if (network.includes(fromId) && network.includes(toId)) {
      return true;
    }
  }
  return false;
}

// Networks for deposits/withdrawals
export interface Network {
  id: string;
  name: string;
  symbol: string;
  confirmations: number;
  avgBlockTime: number; // seconds
}

export const NETWORKS: Network[] = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", confirmations: 3, avgBlockTime: 600 },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", confirmations: 12, avgBlockTime: 12 },
  { id: "bsc", name: "BNB Smart Chain", symbol: "BNB", confirmations: 15, avgBlockTime: 3 },
  { id: "solana", name: "Solana", symbol: "SOL", confirmations: 32, avgBlockTime: 0.4 },
  { id: "polygon", name: "Polygon", symbol: "POL", confirmations: 128, avgBlockTime: 2 },
  { id: "avalanche", name: "Avalanche", symbol: "AVAX", confirmations: 1, avgBlockTime: 2 },
  { id: "arbitrum", name: "Arbitrum", symbol: "ARB", confirmations: 12, avgBlockTime: 0.25 },
  { id: "optimism", name: "Optimism", symbol: "OP", confirmations: 12, avgBlockTime: 2 },
  { id: "tron", name: "TRON", symbol: "TRX", confirmations: 19, avgBlockTime: 3 },
];

// Fiat currencies
export const FIAT_CURRENCIES = [
  { code: "usd", symbol: "$", name: "US Dollar" },
  { code: "eur", symbol: "€", name: "Euro" },
  { code: "gbp", symbol: "£", name: "British Pound" },
  { code: "jpy", symbol: "¥", name: "Japanese Yen" },
  { code: "aud", symbol: "A$", name: "Australian Dollar" },
  { code: "cad", symbol: "C$", name: "Canadian Dollar" },
] as const;

// Categories for market filtering
export const MARKET_CATEGORIES = [
  { id: "all", name: "All" },
  { id: "layer-1", name: "Layer 1" },
  { id: "decentralized-finance-defi", name: "DeFi" },
  { id: "meme-token", name: "Meme" },
  { id: "gaming", name: "Gaming" },
  { id: "artificial-intelligence", name: "AI" },
  { id: "non-fungible-tokens-nft", name: "NFTs" },
  { id: "layer-2", name: "Layer 2" },
  { id: "stablecoins", name: "Stablecoins" },
] as const;

// Initial portfolio distribution ($10,000 spread across major coins)
export const INITIAL_PORTFOLIO: Record<string, number> = {
  bitcoin: 0.035,      // ~$3,500 at ~$100k
  ethereum: 0.45,      // ~$1,500 at ~$3,300
  solana: 8,           // ~$1,200 at ~$150
  binancecoin: 2.5,    // ~$1,500 at ~$600
  ripple: 500,         // ~$500 at ~$1
  cardano: 1200,       // ~$500 at ~$0.42
  dogecoin: 2500,      // ~$500 at ~$0.20
  polkadot: 50,        // ~$350 at ~$7
  "avalanche-2": 10,   // ~$250 at ~$25
  chainlink: 12,       // ~$200 at ~$17
};
