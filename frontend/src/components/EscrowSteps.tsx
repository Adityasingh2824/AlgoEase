import { Check } from "lucide-react";

const steps = ["Create Bounty", "Accept Task", "Submit Work", "Approve Work", "Release Payment"];

export function EscrowSteps({ current = 2 }: { current?: number }) {
  return (
    <div className="card-soft p-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">Escrow flow</h3>
        <span className="pill bg-mint px-3 py-1 text-xs font-medium text-mint-foreground">In progress</span>
      </div>
      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                  done
                    ? "bg-mint text-mint-foreground"
                    : active
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-sm ${active ? "font-semibold" : done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
