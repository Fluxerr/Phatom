"use client";

import { supabase, isSupabaseConfigured } from "../supabase";

export interface Transfer {
  id?: string;
  from_wallet_id: string;
  to_address: string;
  to_wallet_id?: string;
  coin_id: string;
  coin_symbol: string;
  amount: number;
  fiat_value: number;
  network: string;
  tx_hash: string;
  status: "pending" | "claimed" | "expired";
  created_at?: string;
}

export interface AddressRegistration {
  wallet_id: string;
  network: string;
  address: string;
  wallet_name: string;
}

// ─── Local Backup Storage for offline/resilience ───
const LOCAL_REGISTRY_KEY = "phantom_address_registry_v1";
const LOCAL_TRANSFERS_KEY = "phantom_pending_transfers_v1";

function getLocalRegistry(): Record<string, AddressRegistration> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRegistry(address: string, reg: AddressRegistration) {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalRegistry();
    current[address.trim()] = reg;
    current[address.trim().toLowerCase()] = reg;
    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(current));
  } catch {
    // Ignore
  }
}

function getLocalTransfers(): Transfer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_TRANSFERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransfer(transfer: Transfer) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalTransfers();
    list.push(transfer);
    localStorage.setItem(LOCAL_TRANSFERS_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

// ─── Address Registry ───

export async function registerAddresses(
  walletId: string,
  walletName: string,
  addresses: Record<string, string>
): Promise<boolean> {
  // Always save locally first for instant offline/cross-tab support
  Object.entries(addresses).forEach(([network, address]) => {
    if (!address) return;
    saveLocalRegistry(address, {
      wallet_id: walletId,
      network,
      address,
      wallet_name: walletName,
    });
  });

  if (!isSupabaseConfigured()) return true;

  try {
    const records = Object.entries(addresses)
      .filter(([_, address]) => !!address)
      .map(([network, address]) => ({
        address: address.trim(),
        wallet_id: walletId,
        network: network.toLowerCase(),
        wallet_name: walletName || "Main Wallet",
      }));

    if (records.length === 0) return true;

    // Use onConflict: "address" since address is the PRIMARY KEY in Supabase
    const { error } = await supabase
      .from("wallet_addresses")
      .upsert(records, { onConflict: "address" });

    if (error) {
      console.warn("Supabase upsert note:", error.message);
      // Fallback: try individual inserts to bypass any partial constraint mismatch
      for (const rec of records) {
        await supabase.from("wallet_addresses").upsert(rec, { onConflict: "address" });
      }
    }

    return true;
  } catch (err) {
    console.error("Address registration error:", err);
    return false;
  }
}

export async function lookupAddress(
  address: string
): Promise<AddressRegistration | null> {
  if (!address) return null;
  const cleanAddress = address.trim();

  // 1. Check local registry (instant match)
  const localMap = getLocalRegistry();
  if (localMap[cleanAddress]) return localMap[cleanAddress];
  if (localMap[cleanAddress.toLowerCase()]) return localMap[cleanAddress.toLowerCase()];

  if (!isSupabaseConfigured()) return null;

  try {
    // Query exact case first, then lowercased fallback
    const { data, error } = await supabase
      .from("wallet_addresses")
      .select("*")
      .or(`address.eq.${cleanAddress},address.eq.${cleanAddress.toLowerCase()}`)
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const matched = data[0] as AddressRegistration;
    saveLocalRegistry(cleanAddress, matched);
    return matched;
  } catch {
    return null;
  }
}

// ─── Transfers ───

export async function createTransfer(transfer: Transfer): Promise<string | null> {
  const cleanToAddress = transfer.to_address.trim();
  
  // Look up recipient wallet ID from registry
  const recipient = await lookupAddress(cleanToAddress);
  const targetWalletId = transfer.to_wallet_id || recipient?.wallet_id || "";

  const record: Transfer = {
    ...transfer,
    to_address: cleanToAddress,
    to_wallet_id: targetWalletId,
    status: "pending",
  };

  // Always save locally as fallback broadcast
  saveLocalTransfer(record);

  if (!isSupabaseConfigured()) {
    return "local_" + Date.now();
  }

  try {
    const { data, error } = await supabase
      .from("transfers")
      .insert({
        from_wallet_id: record.from_wallet_id || "anonymous",
        to_address: record.to_address,
        to_wallet_id: record.to_wallet_id || null,
        coin_id: record.coin_id,
        coin_symbol: record.coin_symbol,
        amount: record.amount,
        fiat_value: record.fiat_value,
        network: record.network,
        tx_hash: record.tx_hash,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.warn("Supabase transfer creation notice:", error.message);
    }

    return data?.id || "tx_" + Date.now();
  } catch (err) {
    console.error("Transfer creation exception:", err);
    return "tx_" + Date.now();
  }
}

export async function getPendingTransfers(
  walletId: string,
  userAddresses: string[] = []
): Promise<Transfer[]> {
  const pendingList: Transfer[] = [];

  // 1. Check local pending transfers
  const localList = getLocalTransfers();
  const lowerAddresses = userAddresses.map(a => a.trim().toLowerCase());

  for (const t of localList) {
    if (t.status === "pending") {
      const isMatch =
        t.to_wallet_id === walletId ||
        lowerAddresses.includes(t.to_address.trim().toLowerCase());
      if (isMatch) {
        pendingList.push(t);
      }
    }
  }

  if (!isSupabaseConfigured()) return pendingList;

  try {
    // 2. Query Supabase by wallet_id or target addresses
    let query = supabase
      .from("transfers")
      .select("*")
      .eq("status", "pending");

    if (userAddresses.length > 0) {
      const addressFilter = userAddresses.map(a => `to_address.eq.${a.trim()}`).join(",");
      query = query.or(`to_wallet_id.eq.${walletId},${addressFilter}`);
    } else {
      query = query.eq("to_wallet_id", walletId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      const existingIds = new Set(pendingList.map(p => p.id || p.tx_hash));
      for (const item of data) {
        if (!existingIds.has(item.id)) {
          pendingList.push(item as Transfer);
        }
      }
    }
  } catch (err) {
    console.warn("Supabase pending transfers check notice:", err);
  }

  return pendingList;
}

export async function claimTransfer(transferId: string): Promise<boolean> {
  // Update local storage status
  if (typeof window !== "undefined") {
    try {
      const list = getLocalTransfers();
      const updated = list.map(t =>
        (t.id === transferId || t.tx_hash === transferId)
          ? { ...t, status: "claimed" as const }
          : t
      );
      localStorage.setItem(LOCAL_TRANSFERS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  if (!isSupabaseConfigured()) return true;

  try {
    const { error } = await supabase
      .from("transfers")
      .update({ status: "claimed" })
      .eq("id", transferId);

    if (error) {
      console.warn("Supabase claim notice:", error.message);
    }
    return true;
  } catch {
    return true;
  }
}

// ─── Real-time Subscriptions ───

export function subscribeToTransfers(
  walletId: string,
  onTransfer: (transfer: Transfer) => void
) {
  if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`transfers_${walletId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transfers",
      },
      (payload) => {
        const newTx = payload.new as Transfer;
        if (newTx.to_wallet_id === walletId) {
          onTransfer(newTx);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
