import { Check } from "lucide-react";
import { statusToStep } from "@/hooks/useEscrow";

const steps = ["Create Bounty", "Accept Task", "Submit Work", "Approve Work", "Release Payment"];

const statusLabels: Record<string, string> = {
  OPEN: "Awaiting acceptance",
  ACCEPTED: "In progress",
  SUBMITTED: "Review pending",
  APPROVED: "Approved — releasing",
  RELEASED: "Completed",
  REFUNDED: "Refunded",
  REJECTED: "Rejected — refunded",
};

export function EscrowSteps({ current = 0, status }: { current?: number; status?: string }) {
  const step = status ? statusToStep(status as any) : current;
  const label = status ? (statusLabels[status] ?? "In progress") : "In progress";
  const isTerminal = status === "RELEASED" || status === "REFUNDED" || status === "REJECTED";

  return (
    <div className="card-soft p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Escrow flow</h3>
        <span
          className={`pill px-3 py-1 text-xs font-medium ${
            isTerminal
              ? status === "RELEASED"
                ? "bg-mint text-mint-foreground"
                : status === "REJECTED"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-blush text-blush-foreground"
              : "bg-mint text-mint-foreground"
          }`}
        >
          {label}
        </span>
      </div>
      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step && !isTerminal;
          return (
            <li key={s} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                  done || (isTerminal && i <= step)
                    ? "bg-mint text-mint-foreground"
                    : active
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done || (isTerminal && i <= step) ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-sm ${active ? "font-semibold" : done ? "text-muted-foreground line-through" : "text-foreground"}`}
              >
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
