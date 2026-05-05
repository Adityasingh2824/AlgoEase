import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Zap } from "lucide-react";
import { useApp } from "@/lib/app-context";
import type { WalletTxnKind } from "@/lib/wallet/wallet-service";

export function PaymentRequiredModal({
  open,
  onClose,
  action,
  cost,
  transactionKind = "x402_deposit",
}: {
  open: boolean;
  onClose: () => void;
  action: string;
  cost: number;
  transactionKind?: WalletTxnKind;
}) {
  const { signFlowTransaction, walletAddress } = useApp();
  const [stage, setStage] = useState<"required" | "paying" | "done" | "error">("required");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStage("required");
    setErrorMessage(null);
    const t1 = setTimeout(() => setStage("paying"), 700);
    const t2 = setTimeout(async () => {
      try {
        if (!walletAddress) throw new Error("Connect wallet before signing");
        await signFlowTransaction(transactionKind, cost);
        setStage("done");
      } catch (err) {
        setStage("error");
        setErrorMessage(err instanceof Error ? err.message : "Signing failed");
      }
    }, 1800);
    const t3 = setTimeout(() => onClose(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [open, onClose, signFlowTransaction, transactionKind, cost, walletAddress]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm card-soft p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lemon">
          {stage === "done" ? <CheckCircle2 className="h-6 w-6" /> : stage === "paying" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Zap className="h-6 w-6" />}
        </div>
        <h3 className="mt-4 font-display text-lg font-bold">
          {stage === "required" && "Payment required to proceed"}
          {stage === "paying" && "Processing x402 payment…"}
          {stage === "done" && "Payment verified"}
          {stage === "error" && "Wallet signature failed"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {stage === "error"
            ? (errorMessage ?? "Could not complete signing request.")
            : stage === "done"
            ? "Action executed automatically."
            : `${action} — ${cost} ALGO via x402`}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 pill bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          x402 Protected
        </div>
      </div>
    </div>
  );
}
