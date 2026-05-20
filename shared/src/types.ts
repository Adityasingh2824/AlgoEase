// ─── Escrow Status ───────────────────────────────────────────────────────────

export type EscrowStatus =
  | "OPEN"
  | "ACCEPTED"
  | "SUBMITTED"
  | "APPROVED"
  | "RELEASED"
  | "REFUNDED";

export type EscrowEventType =
  | "DEPOSIT"
  | "ACCEPTED"
  | "SUBMITTED"
  | "APPROVED"
  | "RELEASED"
  | "REFUNDED";

// ─── Bounty ──────────────────────────────────────────────────────────────────

export interface Bounty {
  id: string;
  task_id: string;
  title: string;
  description: string;
  client_address: string;
  freelancer_address: string | null;
  amount: string;
  asset: "ALGO" | string; // ASA ID string for USDC-A
  status: EscrowStatus;
  app_id: string | null;
  ipfs_cid: string | null;
  deposit_tx_id: string | null;
  release_tx_id: string | null;
  refund_tx_id: string | null;
  deadline_at: string; // ISO timestamp
  created_at: string;
  updated_at: string;
}

// ─── Escrow Event ────────────────────────────────────────────────────────────

export interface EscrowEvent {
  id: string;
  task_id: string;
  event_type: EscrowEventType;
  tx_id: string | null;
  actor: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── x402 Payment Payload ────────────────────────────────────────────────────

export interface X402PaymentAccept {
  scheme: "exact";
  network: "algorand-testnet" | "algorand-mainnet";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string; // "ALGO" or USDC ASA ID
  extra?: { taskId: string };
}

export interface X402PaymentPayload {
  version: "1.0";
  accepts: X402PaymentAccept[];
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface EscrowCreateRequest {
  task_id: string;
  title: string;
  description: string;
  /** Omit for open bounties; freelancer is set when someone accepts. */
  freelancer_address?: string;
  deadline_hours: number;
  amount: string;
  asset: "ALGO" | string;
}

export interface EscrowActionResponse {
  action: string;
  appId: number | string;
  txId?: string;
  txIds?: string[];
  confirmation?: unknown;
}
