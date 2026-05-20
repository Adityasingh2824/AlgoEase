import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { executeWalletEscrowCall } from "@/lib/escrow-client";

/** Dev-only: top up escrow app liquid ALGO for box MBR before inner payouts. */
async function ensureEscrowAppFunded() {
  if (!import.meta.env.DEV) return;
  try {
    await api("/api/health/fund-app", { method: "POST" });
  } catch {
    /* non-fatal — release may still succeed if app already has seed */
  }
}

export function useEscrowActions(taskId: string, onSuccess?: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setBusy(label);
      setError(null);
      try {
        const result = await fn();
        onSuccess?.();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed";
        setError(message);
        throw err;
      } finally {
        setBusy(null);
      }
    },
    [onSuccess],
  );

  const acceptTask = useCallback(
    (address: string, appId: number) =>
      run("accept", async () => {
        const { txId } = await executeWalletEscrowCall(address, taskId, "acceptTask", [], appId);
        return api(`/escrow/${taskId}/accept`, {
          method: "POST",
          body: { address, tx_id: txId },
        });
      }),
    [run, taskId],
  );

  const submitWork = useCallback(
    (freelancerAddress: string, ipfsCid: string, appId: number) =>
      run("submit", async () => {
        const { txId } = await executeWalletEscrowCall(
          freelancerAddress,
          taskId,
          "submitWork",
          [ipfsCid],
          appId,
        );
        return api(`/escrow/${taskId}/submit`, {
          method: "POST",
          body: { freelancer_address: freelancerAddress, ipfs_cid: ipfsCid, tx_id: txId },
        });
      }),
    [run, taskId],
  );

  const approveWork = useCallback(
    (clientAddress: string, appId: number) =>
      run("approve", async () => {
        const { txId } = await executeWalletEscrowCall(clientAddress, taskId, "approve", [], appId);
        return api(`/escrow/${taskId}/approve`, {
          method: "POST",
          body: { address: clientAddress, tx_id: txId },
        });
      }),
    [run, taskId],
  );

  const releasePayment = useCallback(
    (clientAddress: string, freelancerAddress: string, appId: number) =>
      run("release", async () => {
        await ensureEscrowAppFunded();
        const { txId } = await executeWalletEscrowCall(
          clientAddress,
          taskId,
          "releasePayment",
          [],
          appId,
          { accounts: [freelancerAddress] },
        );
        return api(`/escrow/${taskId}/release`, {
          method: "POST",
          body: { address: clientAddress, tx_id: txId },
        });
      }),
    [run, taskId],
  );

  const refundEscrow = useCallback(
    (clientAddress: string, appId: number) =>
      run("refund", async () => {
        await ensureEscrowAppFunded();
        const { txId } = await executeWalletEscrowCall(clientAddress, taskId, "refund", [], appId);
        return api(`/escrow/${taskId}/refund`, {
          method: "POST",
          body: { address: clientAddress, tx_id: txId },
        });
      }),
    [run, taskId],
  );

  const rejectWork = useCallback(
    (clientAddress: string, appId: number) =>
      run("reject", async () => {
        await ensureEscrowAppFunded();
        const { txId } = await executeWalletEscrowCall(clientAddress, taskId, "rejectWork", [], appId);
        return api(`/escrow/${taskId}/reject`, {
          method: "POST",
          body: { address: clientAddress, tx_id: txId },
        });
      }),
    [run, taskId],
  );

  return {
    acceptTask,
    submitWork,
    approveWork,
    releasePayment,
    refundEscrow,
    rejectWork,
    busy,
    error,
    clearError: () => setError(null),
  };
}
