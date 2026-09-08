"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  currency: string;
  theme: "dark" | "light";
  autoLockMinutes: number;
  biometricEnabled: boolean;
  notifications: boolean;
  
  setCurrency: (currency: string) => void;
  setTheme: (theme: "dark" | "light") => void;
  setAutoLock: (minutes: number) => void;
  setBiometric: (enabled: boolean) => void;
  setNotifications: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: "usd",
      theme: "dark",
      autoLockMinutes: 5,
      biometricEnabled: false,
      notifications: true,

      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),
      setAutoLock: (minutes) => set({ autoLockMinutes: minutes }),
      setBiometric: (enabled) => set({ biometricEnabled: enabled }),
      setNotifications: (enabled) => set({ notifications: enabled }),
    }),
    {
      name: "phantom-settings",
    }
  )
);
