import type { EscrowStatus } from "@/hooks/useEscrow";
import { CheckCircle2, Flag, HandHelping, Loader2, Send, Undo2, Wallet, XCircle } from "lucide-react";

type Props = {
  status?: EscrowStatus | string;
  isClient: boolean;
  walletConnected: boolean;
  /** OPEN bounty, not created by connected wallet */
  showAccept?: boolean;
  /** ACCEPTED and connected wallet is assignee */
  showSubmit?: boolean;
  hasOnChain: boolean;
  busy: string | null;
  onFund?: () => void;
  onAccept?: () => void;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRelease?: () => void;
  onRefund?: () => void;
  onConnectWallet?: () => void;
  compact?: boolean;
};

export function EscrowActionPanel({
  status,
  isClient,
  walletConnected,
  showAccept = false,
  showSubmit = false,
  hasOnChain,
  busy,
  onFund,
  onAccept,
  onSubmit,
  onApprove,
  onReject,
  onRelease,
  onRefund,
  onConnectWallet,
  compact = false,
}: Props) {
  const btn = compact
    ? "w-full pill py-3 text-sm font-semibold transition"
    : "pill px-5 py-2.5 text-sm font-semibold transition";
  const wrap = compact ? "space-y-3" : "flex flex-wrap gap-3";

  const renderBtn = (
    label: string,
    onClick: (() => void) | undefined,
    variant: "mint" | "ink" | "outline" | "destructive",
    icon: React.ReactNode,
    actionKey: string,
  ) => {
    if (!onClick) return null;
    const loading = busy === actionKey;
    const disabled = Boolean(busy);
    const variantClass =
      variant === "mint"
        ? "bg-mint text-mint-foreground hover:opacity-95"
        : variant === "ink"
          ? "bg-ink text-ink-foreground hover:opacity-95"
          : variant === "destructive"
            ? "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
            : "border border-border bg-card hover:bg-muted";
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex items-center justify-center gap-2 ${btn} ${variantClass} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </button>
    );
  };

  if (!hasOnChain) {
    return (
      <div className={wrap}>
        {renderBtn("Fund escrow (x402)", onFund, "mint", <HandHelping className="h-4 w-4" />, "fund")}
      </div>
    );
  }

  const s = status ?? "OPEN";

  return (
    <div className={wrap}>
      {showAccept &&
        renderBtn(
          walletConnected ? "Accept bounty" : "Connect wallet to accept",
          walletConnected ? onAccept : onConnectWallet,
          "mint",
          <CheckCircle2 className="h-4 w-4" />,
          "accept",
        )}
      {showSubmit &&
        renderBtn(
          walletConnected ? "Submit work" : "Connect wallet to submit",
          walletConnected ? onSubmit : onConnectWallet,
          "mint",
          <Send className="h-4 w-4" />,
          "submit",
        )}
      {s === "SUBMITTED" && isClient && (
        <>
          {renderBtn("Approve work", onApprove, "ink", <Flag className="h-4 w-4" />, "approve")}
          {renderBtn(
            "Reject work",
            onReject,
            "destructive",
            <XCircle className="h-4 w-4" />,
            "reject",
          )}
        </>
      )}
      {(s === "OPEN" || s === "ACCEPTED") && isClient &&
        renderBtn("Request refund", onRefund, "outline", <Undo2 className="h-4 w-4" />, "refund")}
      {s === "APPROVED" && isClient &&
        renderBtn("Release payment", onRelease, "mint", <Wallet className="h-4 w-4" />, "release")}
      {s === "RELEASED" && (
        <p className="text-sm font-medium text-mint-foreground">Payment released to freelancer.</p>
      )}
      {s === "REJECTED" && (
        <p className="text-sm font-medium text-destructive">
          Work rejected — escrow refunded to your wallet.
        </p>
      )}
      {s === "REFUNDED" && (
        <p className="text-sm font-medium text-muted-foreground">Escrow refunded to client.</p>
      )}
      {s === "OPEN" && isClient && (
        <p className="text-sm text-muted-foreground">Waiting for a freelancer to accept this bounty.</p>
      )}
    </div>
  );
}
