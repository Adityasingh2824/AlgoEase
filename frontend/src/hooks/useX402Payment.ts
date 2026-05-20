/**
 * useX402Payment — handles the 402 → sign → retry flow for simple payment-gated API calls.
 */
import { useCallback, useState } from "react";
import { api, apiWithPayment, PaymentRequiredError } from "@/lib/api";
import { submitCreateEscrowFromWallet } from "@/lib/create-escrow-client";
import type { X402PaymentAccept } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { ensureWalletService } from "@/lib/wallet/wallet-service";
import algosdk from "algosdk";

export type X402Stage = "idle" | "challenge" | "signing" | "submitting" | "success" | "error";

export interface X402State {
  stage: X402Stage;
  challenge: X402PaymentAccept | null;
  txId: string | null;
  error: string | null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function useX402Payment() {
  const { walletAddress } = useApp();
  const [state, setState] = useState<X402State>({
    stage: "idle",
    challenge: null,
    txId: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({ stage: "idle", challenge: null, txId: null, error: null });
  }, []);

  const execute = useCallback(
    async <T = unknown>(path: string, body?: unknown): Promise<T | null> => {
      try {
        const result = await api<T>(path, { method: "POST", body });
        setState((s) => ({ ...s, stage: "success" }));
        return result;
      } catch (err) {
        if (!(err instanceof PaymentRequiredError)) {
          const msg = err instanceof Error ? err.message : "Request failed";
          setState({ stage: "error", challenge: null, txId: null, error: msg });
          return null;
        }

        const accept = err.payload.accepts[0];
        if (!accept) {
          setState({ stage: "error", challenge: null, txId: null, error: "No payment options available" });
          return null;
        }

        if (!walletAddress) {
          setState({ stage: "error", challenge: accept, txId: null, error: "Connect wallet to sign payment" });
          return null;
        }

        setState({ stage: "challenge", challenge: accept, txId: null, error: null });

        try {
          setState((s) => ({ ...s, stage: "signing" }));

          const service = await ensureWalletService();
          if (!service) throw new Error("Wallet service unavailable");

          const suggestedParams = await service.algodClient.getTransactionParams().do();
          const amount = Number(accept.maxAmountRequired);
          const isUsdc = accept.asset !== "ALGO";
          const note = new TextEncoder().encode(`algoease:x402:${accept.extra?.taskId ?? ""}`);

          const txn = isUsdc
            ? algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
                sender: walletAddress,
                receiver: accept.payTo,
                amount,
                assetIndex: Number(accept.asset),
                suggestedParams,
                note,
              })
            : algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                sender: walletAddress,
                receiver: accept.payTo,
                amount,
                suggestedParams,
                note,
              });

          const signed = await service.signTransaction(txn);
          const signedBase64 = bytesToBase64(signed[0]!);

          setState((s) => ({ ...s, stage: "submitting" }));

          const paid = await apiWithPayment<T>(path, body, signedBase64);

          const txIdResult =
            (paid as { txId?: string; txIds?: string[] })?.txId ??
            (paid as { txIds?: string[] })?.txIds?.[0] ??
            null;

          setState({ stage: "success", challenge: accept, txId: txIdResult, error: null });
          return paid;
        } catch (signErr) {
          const msg = signErr instanceof Error ? signErr.message : "Payment signing failed";
          setState((s) => ({ ...s, stage: "error", error: msg }));
          return null;
        }
      }
    },
    [walletAddress],
  );

  return { ...state, execute, reset };
}

export interface CreateBountyPayload {
  task_id: string;
  title: string;
  description: string;
  deadline_hours: number;
  amount: string;
  asset: string;
}

/**
 * x402 challenge → wallet signs atomic create_escrow group → sync metadata to API.
 */
export function useCreateBountyFunding() {
  const { walletAddress } = useApp();
  const [state, setState] = useState<X402State>({
    stage: "idle",
    challenge: null,
    txId: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({ stage: "idle", challenge: null, txId: null, error: null });
  }, []);

  const fund = useCallback(
    async (body: CreateBountyPayload): Promise<{ taskId: string; txIds: string[] } | null> => {
      if (!walletAddress) {
        setState({ stage: "error", challenge: null, txId: null, error: "Connect wallet to sign payment" });
        return null;
      }

      try {
        await api("/escrow/create", { method: "POST", body });
        setState((s) => ({ ...s, stage: "success" }));
        return { taskId: body.task_id, txIds: [] };
      } catch (err) {
        if (!(err instanceof PaymentRequiredError)) {
          const msg = err instanceof Error ? err.message : "Request failed";
          setState({ stage: "error", challenge: null, txId: null, error: msg });
          return null;
        }

        const accept = err.payload.accepts[0];
        if (!accept) {
          setState({ stage: "error", challenge: null, txId: null, error: "No payment options available" });
          return null;
        }

        setState({ stage: "challenge", challenge: accept, txId: null, error: null });

        try {
          setState((s) => ({ ...s, stage: "signing" }));
          const deadlineTimestamp = Math.floor(Date.now() / 1000) + body.deadline_hours * 3600;

          const { txIds } = await submitCreateEscrowFromWallet({
            accept,
            taskId: body.task_id,
            senderAddress: walletAddress,
            deadlineTimestamp,
          });

          setState((s) => ({ ...s, stage: "submitting" }));

          await api("/escrow/sync-create", {
            method: "POST",
            body: {
              ...body,
              tx_ids: txIds,
              client_address: walletAddress,
            },
          });

          const txId = txIds[0] ?? null;
          setState({ stage: "success", challenge: accept, txId, error: null });
          return { taskId: body.task_id, txIds };
        } catch (signErr) {
          const msg = signErr instanceof Error ? signErr.message : "Escrow creation failed";
          setState((s) => ({ ...s, stage: "error", error: msg }));
          return null;
        }
      }
    },
    [walletAddress],
  );

  return { ...state, fund, reset };
}
