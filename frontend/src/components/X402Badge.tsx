import { Lock, Zap } from "lucide-react";

export function X402Badge({ variant = "protected" }: { variant?: "protected" | "required" }) {
  if (variant === "required") {
    return (
      <span className="inline-flex items-center gap-1 pill bg-lemon px-2.5 py-1 text-[11px] font-semibold text-lemon-foreground">
        <Zap className="h-3 w-3" /> Payment required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 pill bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
      <Lock className="h-3 w-3" /> x402 Protected
    </span>
  );
}
