export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-ink-foreground font-display font-bold">
        a
      </div>
      <span className="font-display text-lg font-bold tracking-tight">algoease</span>
    </div>
  );
}
