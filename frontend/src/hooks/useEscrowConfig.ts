import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CURRENT_ESCROW_APP_ID } from "@/lib/algorand-config";

type HealthPayload = {
  escrowAppId?: number;
  escrowAppAddress?: string;
};

export function useEscrowConfig() {
  const [backendAppId, setBackendAppId] = useState<number | null>(null);
  const [backendAppAddress, setBackendAppAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<HealthPayload>("/api/health")
      .then((data) => {
        if (data.escrowAppId) setBackendAppId(data.escrowAppId);
        if (data.escrowAppAddress) setBackendAppAddress(data.escrowAppAddress);
      })
      .catch(() => {
        /* backend offline — rely on VITE_ALGORAND_APP_ID */
      })
      .finally(() => setLoading(false));
  }, []);

  const mismatch =
    backendAppId !== null && Number.isFinite(backendAppId) && backendAppId !== CURRENT_ESCROW_APP_ID;

  return {
    frontendAppId: CURRENT_ESCROW_APP_ID,
    backendAppId,
    backendAppAddress,
    mismatch,
    loading,
  };
}
