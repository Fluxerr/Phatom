"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateWalletId } from "../utils/crypto";

interface AuthState {
  isOnboarded: boolean;
  pin: string | null;
  isLocked: boolean;
  walletName: string;
  walletId: string;
  seedPhrase: string[] | null;
  
  // Actions
  completeOnboarding: (pin: string, seedPhrase: string[], walletName?: string) => void;
  lock: () => void;
  unlock: (enteredPin: string) => boolean;
  setPin: (newPin: string) => void;
  setWalletName: (name: string) => void;
  resetWallet: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isOnboarded: false,
      pin: null,
      isLocked: false,
      walletName: "Main Wallet",
      walletId: "",
      seedPhrase: null,

      completeOnboarding: (pin, seedPhrase, walletName) => {
        const existingId = get().walletId;
        set({
          isOnboarded: true,
          pin,
          seedPhrase,
          isLocked: false,
          walletName: walletName || "Main Wallet",
          walletId: existingId || generateWalletId(),
        });
      },

      lock: () => set({ isLocked: true }),

      unlock: (enteredPin) => {
        const { pin } = get();
        if (enteredPin === pin) {
          set({ isLocked: false });
          return true;
        }
        return false;
      },

      setPin: (newPin) => set({ pin: newPin }),
      setWalletName: (name) => set({ walletName: name }),

      resetWallet: () => {
        set({
          isOnboarded: false,
          pin: null,
          isLocked: false,
          walletName: "Main Wallet",
          walletId: "",
          seedPhrase: null,
        });
      },
    }),
    {
      name: "phantom-auth",
      onRehydrateStorage: () => (state) => {
        if (state && state.isOnboarded && !state.walletId) {
          state.walletId = generateWalletId();
        }
      },
    }
  )
);
