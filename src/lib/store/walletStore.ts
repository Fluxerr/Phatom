"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { INITIAL_PORTFOLIO, SUPPORTED_COINS, NETWORKS } from "../utils/constants";
import { generateAddress, generateTxHash, generateDeterministicAddress } from "../utils/crypto";
import {
  registerAddresses,
  lookupAddress,
  createTransfer,
  getPendingTransfers,
  claimTransfer,
} from "./transferStore";

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
  // For P2P transfers
  isInternalTransfer?: boolean;
  recipientWalletName?: string;
}

interface WalletState {
  // Balances: coinId -> amount
  balances: Record<string, number>;
  // Wallet addresses per network (deterministic, persisted)
  addresses: Record<string, string>;
  // Transaction history
  transactions: Transaction[];
  // Hidden balance mode
  hideBalance: boolean;
  // Visible coins (which ones to show in portfolio)
  visibleCoins: string[];

  // Actions
  initializeWallet: (walletId: string, seedPhrase: string[]) => void;
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
  executeSend: (coinId: string, amount: number, toAddress: string, network: string, price: number) => Promise<Transaction>;
  executeReceive: (coinId: string, amount: number, network: string, price: number) => Transaction;
  executeSwap: (fromCoinId: string, fromAmount: number, toCoinId: string, toAmount: number, fromPrice: number, toPrice: number) => Transaction;
  
  // P2P transfer helpers
  checkIncomingTransfers: (walletId: string) => Promise<Transaction[]>;
  registerWalletAddresses: (walletId: string, walletName: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balances: {},
      addresses: {},
      transactions: [],
      hideBalance: false,
      visibleCoins: SUPPORTED_COINS.filter(c => c.isMajor).map(c => c.id),

      initializeWallet: (walletId: string, seedPhrase: string[]) => {
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

        // Generate deterministic addresses for all networks using seed phrase
        const seed = seedPhrase.join(" ");
        const addresses: Record<string, string> = {};
        
        // Generate an address for every unique network across all coins
        const allNetworks = new Set<string>();
        SUPPORTED_COINS.forEach(coin => {
          coin.networks.forEach(net => allNetworks.add(net));
        });
        NETWORKS.forEach(net => allNetworks.add(net.id));

        allNetworks.forEach(network => {
          addresses[network] = generateDeterministicAddress(`${walletId}:${seed}`, network);
        });

        set({
          balances,
          addresses,
          visibleCoins: SUPPORTED_COINS.filter(c => c.isMajor).map(c => c.id),
          transactions: [],
        });

        // Register with Supabase & local registry immediately upon creation
        if (walletId) {
          registerAddresses(walletId, "Main Wallet", addresses);
        }
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
        // Fallback: generate a random one if not pre-generated
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

      executeSend: async (coinId, amount, toAddress, network, price) => {
        const state = get();
        const coin = SUPPORTED_COINS.find(c => c.id === coinId);
        const fee = amount * 0.001; // 0.1% simulated fee
        const total = amount + fee;
        
        if ((state.balances[coinId] || 0) < total) {
          throw new Error("Insufficient balance");
        }

        // Check if recipient is a known address (P2P transfer)
        const recipient = await lookupAddress(toAddress);
        const isInternal = !!recipient;

        // Deduct balance
        set(s => ({
          balances: {
            ...s.balances,
            [coinId]: (s.balances[coinId] || 0) - total,
          },
        }));

        const fromAddress = state.addresses[network] || generateAddress(network);
        const txHash = generateTxHash(network);
        
        const tx: Omit<Transaction, "id"> = {
          type: "send",
          coinId,
          coinSymbol: coin?.symbol || coinId.toUpperCase(),
          amount,
          fiatValue: amount * price,
          fromAddress,
          toAddress,
          txHash,
          network,
          fee,
          status: isInternal ? "confirmed" : "confirming",
          timestamp: Date.now(),
          confirmations: isInternal ? 12 : 0,
          requiredConfirmations: 12,
          isInternalTransfer: isInternal,
          recipientWalletName: recipient?.wallet_name,
        };

        const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const transaction: Transaction = { ...tx, id };
        set(s => ({ transactions: [transaction, ...s.transactions] }));

        // Create P2P transfer record in Supabase & Local Registry
        await createTransfer({
          from_wallet_id: "",
          to_address: toAddress.trim(),
          to_wallet_id: recipient?.wallet_id,
          coin_id: coinId,
          coin_symbol: coin?.symbol || coinId.toUpperCase(),
          amount,
          fiat_value: amount * price,
          network,
          tx_hash: txHash,
          status: "pending",
        });

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

      // Check for and claim incoming P2P transfers
      checkIncomingTransfers: async (walletId: string): Promise<Transaction[]> => {
        const userAddrs = Object.values(get().addresses);
        const pending = await getPendingTransfers(walletId, userAddrs);
        const claimed: Transaction[] = [];

        for (const transfer of pending) {
          const success = await claimTransfer(transfer.id!);
          if (success) {
            // Add balance
            set(s => ({
              balances: {
                ...s.balances,
                [transfer.coin_id]: (s.balances[transfer.coin_id] || 0) + transfer.amount,
              },
              // Make sure coin is visible
              visibleCoins: Array.from(new Set([...s.visibleCoins, transfer.coin_id])),
            }));

            // Add to transaction history
            const tx: Transaction = {
              id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              type: "receive",
              coinId: transfer.coin_id,
              coinSymbol: transfer.coin_symbol,
              amount: transfer.amount,
              fiatValue: transfer.fiat_value,
              fromAddress: "P2P Transfer",
              toAddress: get().addresses[transfer.network] || "",
              txHash: transfer.tx_hash,
              network: transfer.network,
              fee: 0,
              status: "confirmed",
              timestamp: Date.now(),
              confirmations: 12,
              requiredConfirmations: 12,
              isInternalTransfer: true,
            };

            set(s => ({ transactions: [tx, ...s.transactions] }));
            claimed.push(tx);
          }
        }

        return claimed;
      },

      // Register wallet addresses with Supabase
      registerWalletAddresses: async (walletId: string, walletName: string) => {
        const { addresses } = get();
        await registerAddresses(walletId, walletName, addresses);
      },
    }),
    {
      name: "phantom-wallet",
    }
  )
);
