import { CheckCircle2, Loader2, XCircle, Zap } from "lucide-react";
import type { X402Stage } from "@/hooks/useX402Payment";
import { useAlgorand } from "@/hooks/useAlgorand";

export function PaymentRequiredModal({
  open,
  onClose,
  action,
  cost,
  asset = "ALGO",
  stage = "idle",
  txId,
  error,
  payTo,
}: {
  open: boolean;
  onClose: () => void;
  action: string;
  cost: number;
  asset?: string;
  stage?: X402Stage;
  txId?: string | null;
  error?: string | null;
  payTo?: string;
}) {
  const { txnUrl, usdcAssetId } = useAlgorand();

  if (!open) return null;

  const displayStage = stage === "idle" || stage === "challenge" ? "required" : stage;
  const assetLabel =
    asset === "ALGO"
      ? "ALGO"
      : asset === "USDC-A" || asset === usdcAssetId
        ? "USDC-A"
        : `ASA ${asset}`;
  const amountDisplay = (cost / 1_000_000).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm card-soft p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lemon">
          {displayStage === "success" ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : displayStage === "error" ? (
            <XCircle className="h-6 w-6 text-destructive" />
          ) : displayStage === "signing" || displayStage === "submitting" ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Zap className="h-6 w-6" />
          )}
        </div>

        <h3 className="mt-4 font-display text-lg font-bold">
          {displayStage === "required" && "Payment required"}
          {displayStage === "signing" && "Sign in your wallet"}
          {displayStage === "submitting" && "Verifying payment..."}
          {displayStage === "success" && "Payment verified"}
          {displayStage === "error" && "Payment failed"}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          {displayStage === "error"
            ? (error ?? "Could not complete the payment.")
            : displayStage === "success"
              ? "Transaction confirmed on Algorand."
              : `${action} — ${amountDisplay} ${assetLabel} via x402`}
        </p>

        {payTo && displayStage === "required" && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            → {payTo.slice(0, 8)}...{payTo.slice(-6)}
          </p>
        )}

        {txId && displayStage === "success" && (
          <a
            href={txnUrl(txId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-primary underline"
          >
            View on Explorer
          </a>
        )}

        <div className="mt-4 inline-flex items-center gap-2 pill bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          x402 Protected
        </div>

        {(displayStage === "success" || displayStage === "error") && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 block w-full pill bg-muted py-2.5 text-sm font-medium hover:bg-muted/80 transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
