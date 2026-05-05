import { X } from "lucide-react";

export function CounterOfferModal({
  open,
  onClose,
  requestedAlgo,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  requestedAlgo: number;
  onConfirm?: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[0_24px_80px_-20px_oklch(0_0_0/0.35)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="flex-1 text-center font-display text-lg font-bold">Make a counter offer</h2>
          <span className="w-9" />
        </div>

        <div className="mt-8 text-center">
          <p className="font-display text-4xl font-bold tabular-nums">{requestedAlgo} ALGO</p>
          <p className="mt-1 text-sm text-muted-foreground">amount requested</p>
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
          Enter the minimum amount you need to complete this bounty. Your backer will be notified — they can accept and
          update their pledge, or enable crowdfunding.
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
            className="flex-1 pill bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 pill border border-border bg-card py-3 text-sm font-semibold hover:bg-muted transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
