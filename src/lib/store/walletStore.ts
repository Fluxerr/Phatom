"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { INITIAL_PORTFOLIO, SUPPORTED_COINS } from "../utils/constants";
import { generateAddress, generateTxHash } from "../utils/crypto";

export type TransactionType = "send" | "receive" | "swap" | "deposit" | "withdraw";
export type TransactionStatus = "pending" | "confirming" | "confirmed" | "failed";

export interface Transaction {
  id: string;
  type: TransactionType;
  coinId: string;
  coinSymbol: string;
  amount: number;
  fiatValue: number;
  fromAddress: string;
  toAddress: string;
  txHash: string;
  network: string;
  fee: number;
  status: TransactionStatus;
  timestamp: number;
  confirmations: number;
  requiredConfirmations: number;
  // For swaps
  toCoinId?: string;
  toCoinSymbol?: string;
  toAmount?: number;
}

interface WalletState {
  // Balances: coinId -> amount
  balances: Record<string, number>;
  // Wallet addresses per network
  addresses: Record<string, string>;
  // Transaction history
  transactions: Transaction[];
  // Hidden balance mode
  hideBalance: boolean;
  // Visible coins (which ones to show in portfolio)
  visibleCoins: string[];

  // Actions
  initializeWallet: () => void;
  getBalance: (coinId: string) => number;
  setBalance: (coinId: string, amount: number) => void;
  addBalance: (coinId: string, amount: number) => void;
  subtractBalance: (coinId: string, amount: number) => boolean;
  getAddress: (network: string) => string;
  addTransaction: (tx: Omit<Transaction, "id">) => string;
  updateTransactionStatus: (txId: string, status: TransactionStatus, confirmations?: number) => void;
  toggleHideBalance: () => void;
  toggleCoinVisibility: (coinId: string) => void;
  resetWallet: () => void;
  
  // Complex transaction helpers
  executeSend: (coinId: string, amount: number, toAddress: string, network: string, price: number) => Transaction;
  executeReceive: (coinId: string, amount: number, network: string, price: number) => Transaction;
  executeSwap: (fromCoinId: string, fromAmount: number, toCoinId: string, toAmount: number, fromPrice: number, toPrice: number) => Transaction;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balances: {},
      addresses: {},
      transactions: [],
      hideBalance: false,
      visibleCoins: SUPPORTED_COINS.filter(c => c.isMajor).map(c => c.id),

      initializeWallet: () => {
        const balances: Record<string, number> = {};
        // Set initial balances for major coins
        Object.entries(INITIAL_PORTFOLIO).forEach(([coinId, amount]) => {
          balances[coinId] = amount;
        });
        // Set zero balance for all other supported coins
        SUPPORTED_COINS.forEach(coin => {
          if (!(coin.id in balances)) {
            balances[coin.id] = 0;
          }
        });

        set({
          balances,
          visibleCoins: SUPPORTED_COINS.filter(c => c.isMajor).map(c => c.id),
          transactions: [],
        });
      },

      getBalance: (coinId) => {
        return get().balances[coinId] || 0;
      },

      setBalance: (coinId, amount) => {
        set(state => ({
          balances: { ...state.balances, [coinId]: Math.max(0, amount) },
        }));
      },

      addBalance: (coinId, amount) => {
        set(state => ({
          balances: {
            ...state.balances,
            [coinId]: (state.balances[coinId] || 0) + amount,
          },
        }));
      },

      subtractBalance: (coinId, amount) => {
        const current = get().balances[coinId] || 0;
        if (current < amount) return false;
        set(state => ({
          balances: {
            ...state.balances,
            [coinId]: current - amount,
          },
        }));
        return true;
      },

      getAddress: (network) => {
        const { addresses } = get();
        if (addresses[network]) return addresses[network];
        const newAddress = generateAddress(network);
        set(state => ({
          addresses: { ...state.addresses, [network]: newAddress },
        }));
        return newAddress;
      },

      addTransaction: (tx) => {
        const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const transaction: Transaction = { ...tx, id };
        set(state => ({
          transactions: [transaction, ...state.transactions],
        }));
        return id;
      },

      updateTransactionStatus: (txId, status, confirmations) => {
        set(state => ({
          transactions: state.transactions.map(tx =>
            tx.id === txId
              ? { ...tx, status, confirmations: confirmations ?? tx.confirmations }
              : tx
          ),
        }));
      },

      toggleHideBalance: () => {
        set(state => ({ hideBalance: !state.hideBalance }));
      },

      toggleCoinVisibility: (coinId) => {
        set(state => {
          const visible = state.visibleCoins.includes(coinId)
            ? state.visibleCoins.filter(id => id !== coinId)
            : [...state.visibleCoins, coinId];
          return { visibleCoins: visible };
        });
      },

      resetWallet: () => {
        set({
          balances: {},
          addresses: {},
          transactions: [],
          hideBalance: false,
          visibleCoins: [],
        });
      },

      executeSend: (coinId, amount, toAddress, network, price) => {
        const state = get();
        const coin = SUPPORTED_COINS.find(c => c.id === coinId);
        const fee = amount * 0.001; // 0.1% simulated fee
        const total = amount + fee;
        
        if ((state.balances[coinId] || 0) < total) {
          throw new Error("Insufficient balance");
        }

        // Deduct balance
        set(s => ({
          balances: {
            ...s.balances,
            [coinId]: (s.balances[coinId] || 0) - total,
          },
        }));

        const fromAddress = state.addresses[network] || generateAddress(network);
        const tx: Omit<Transaction, "id"> = {
          type: "send",
          coinId,
          coinSymbol: coin?.symbol || coinId.toUpperCase(),
          amount,
          fiatValue: amount * price,
          fromAddress,
          toAddress,
          txHash: generateTxHash(network),
          network,
          fee,
          status: "confirming",
          timestamp: Date.now(),
          confirmations: 0,
          requiredConfirmations: 12,
        };

        const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const transaction: Transaction = { ...tx, id };
        set(s => ({ transactions: [transaction, ...s.transactions] }));
        return transaction;
      },

      executeReceive: (coinId, amount, network, price) => {
        const coin = SUPPORTED_COINS.find(c => c.id === coinId);
        
        // Add balance
        set(s => ({
          balances: {
            ...s.balances,
            [coinId]: (s.balances[coinId] || 0) + amount,
          },
        }));

        const toAddress = get().addresses[network] || generateAddress(network);
        const tx: Omit<Transaction, "id"> = {
          type: "receive",
          coinId,
          coinSymbol: coin?.symbol || coinId.toUpperCase(),
          amount,
          fiatValue: amount * price,
          fromAddress: generateAddress(network),
          toAddress,
          txHash: generateTxHash(network),
          network,
          fee: 0,
          status: "confirmed",
          timestamp: Date.now(),
          confirmations: 12,
          requiredConfirmations: 12,
        };

        const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const transaction: Transaction = { ...tx, id };
        set(s => ({ transactions: [transaction, ...s.transactions] }));
        return transaction;
      },

      executeSwap: (fromCoinId, fromAmount, toCoinId, toAmount, fromPrice, toPrice) => {
        const state = get();
        const fromCoin = SUPPORTED_COINS.find(c => c.id === fromCoinId);
        const toCoin = SUPPORTED_COINS.find(c => c.id === toCoinId);

        if ((state.balances[fromCoinId] || 0) < fromAmount) {
          throw new Error("Insufficient balance");
        }

        // Deduct from, add to
        set(s => ({
          balances: {
            ...s.balances,
            [fromCoinId]: (s.balances[fromCoinId] || 0) - fromAmount,
            [toCoinId]: (s.balances[toCoinId] || 0) + toAmount,
          },
          // Make sure both coins are visible
          visibleCoins: Array.from(new Set([...s.visibleCoins, fromCoinId, toCoinId])),
        }));

        const tx: Omit<Transaction, "id"> = {
          type: "swap",
          coinId: fromCoinId,
          coinSymbol: fromCoin?.symbol || fromCoinId.toUpperCase(),
          amount: fromAmount,
          fiatValue: fromAmount * fromPrice,
          fromAddress: "Phantom Wallet",
          toAddress: "Phantom Wallet",
          txHash: generateTxHash("ethereum"),
          network: "ethereum",
          fee: fromAmount * 0.003, // 0.3% swap fee
          status: "confirmed",
          timestamp: Date.now(),
          confirmations: 12,
          requiredConfirmations: 12,
          toCoinId,
          toCoinSymbol: toCoin?.symbol || toCoinId.toUpperCase(),
          toAmount,
        };

        const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const transaction: Transaction = { ...tx, id };
        set(s => ({ transactions: [transaction, ...s.transactions] }));
        return transaction;
      },
    }),
    {
      name: "phantom-wallet",
    }
  )
);
