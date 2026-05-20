/**
 * useEscrow — loads escrow/bounty state from backend + subscribes to Realtime.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export type EscrowStatus =
  | "OPEN"
  | "ACCEPTED"
  | "SUBMITTED"
  | "APPROVED"
  | "RELEASED"
  | "REFUNDED"
  | "REJECTED";

export interface BountyData {
  id: string;
  task_id: string;
  title: string;
  description: string;
  client_address: string;
  freelancer_address: string | null;
  amount: string;
  asset: string;
  status: EscrowStatus;
  app_id: string | null;
  ipfs_cid: string | null;
  deposit_tx_id: string | null;
  release_tx_id: string | null;
  refund_tx_id: string | null;
  deadline_at: string;
  created_at: string;
  updated_at: string;
}

export interface EscrowEvent {
  id: string;
  task_id: string;
  event_type: string;
  tx_id: string | null;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function statusToStep(status: EscrowStatus | string): number {
  switch (status) {
    case "OPEN": return 0;
    case "ACCEPTED": return 1;
    case "SUBMITTED": return 2;
    case "APPROVED": return 3;
    case "RELEASED":
    case "REFUNDED":
    case "REJECTED":
      return 4;
    default: return 0;
  }
}

export function useEscrow(taskId: string | undefined) {
  const [bounty, setBounty] = useState<BountyData | null>(null);
  const [events, setEvents] = useState<EscrowEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEscrow = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ bounty: BountyData; events: EscrowEvent[] }>(`/escrow/${taskId}`);
      setBounty(data.bounty);
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load escrow");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchEscrow();
  }, [fetchEscrow]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!taskId || !supabase) return;

    const channel = supabase
      .channel(`bounty:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bounties",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setBounty((prev) => (prev ? { ...prev, ...(payload.new as Partial<BountyData>) } : prev));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "escrow_events",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as EscrowEvent]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  return { bounty, events, loading, error, refetch: fetchEscrow };
}
