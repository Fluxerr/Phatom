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

// ─── Address Registry (Supabase) ───

export async function registerAddresses(
  walletId: string,
  walletName: string,
  addresses: Record<string, string>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const records = Object.entries(addresses).map(([network, address]) => ({
      wallet_id: walletId,
      network,
      address: address.toLowerCase(),
      wallet_name: walletName,
    }));

    // Upsert to avoid conflicts on re-registration
    const { error } = await supabase
      .from("wallet_addresses")
      .upsert(records, { onConflict: "wallet_id,network" });

    if (error) {
      console.error("Failed to register addresses:", error);
      return false;
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
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from("wallet_addresses")
      .select("*")
      .eq("address", address.toLowerCase())
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as AddressRegistration;
  } catch {
    return null;
  }
}

// ─── Transfers ───

export async function createTransfer(transfer: Transfer): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    // Look up recipient wallet
    const recipient = await lookupAddress(transfer.to_address);
    const record = {
      ...transfer,
      to_address: transfer.to_address.toLowerCase(),
      to_wallet_id: recipient?.wallet_id || null,
      status: "pending" as const,
    };

    const { data, error } = await supabase
      .from("transfers")
      .insert(record)
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create transfer:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("Transfer creation error:", err);
    return null;
  }
}

export async function getPendingTransfers(walletId: string): Promise<Transfer[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .eq("to_wallet_id", walletId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to get pending transfers:", error);
      return [];
    }

    return (data || []) as Transfer[];
  } catch {
    return [];
  }
}

export async function claimTransfer(transferId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from("transfers")
      .update({ status: "claimed" })
      .eq("id", transferId)
      .eq("status", "pending");

    if (error) {
      console.error("Failed to claim transfer:", error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getTransferHistory(
  walletId: string,
  limit: number = 50
): Promise<Transfer[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .or(`from_wallet_id.eq.${walletId},to_wallet_id.eq.${walletId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data || []) as Transfer[];
  } catch {
    return [];
  }
}

// ─── Real-time subscription for incoming transfers ───

export function subscribeToTransfers(
  walletId: string,
  onTransfer: (transfer: Transfer) => void
) {
  if (!isSupabaseConfigured()) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`transfers:${walletId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transfers",
        filter: `to_wallet_id=eq.${walletId}`,
      },
      (payload) => {
        onTransfer(payload.new as Transfer);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
