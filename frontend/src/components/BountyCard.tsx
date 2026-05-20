import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { formatBountyAsset, statusPillClass } from "@/lib/bounties-api";
import { CURRENT_ESCROW_APP_ID, isLegacyOpenBountyApp, resolveEscrowAppId } from "@/lib/algorand-config";

export type Bounty = {
  id: string;
  title: string;
  category: string;
  budget: number;
  funded: number;
  goal: number;
  backers: number;
  creator: string;
  emoji: string;
  tone: "mint" | "lemon" | "blush" | "lilac";
  status?: string;
  asset?: string;
  appId?: string | number | null;
};

const toneBg: Record<Bounty["tone"], string> = {
  mint: "bg-mint",
  lemon: "bg-lemon",
  blush: "bg-blush",
  lilac: "bg-lilac",
};

export function BountyCard({ b }: { b: Bounty }) {
  const pct = Math.min(100, Math.round((b.funded / b.goal) * 100));
  const assetLabel = formatBountyAsset(b.asset);
  const bountyAppId = resolveEscrowAppId(b.appId);
  const outdatedApp = bountyAppId !== CURRENT_ESCROW_APP_ID;
  const legacyAccept = isLegacyOpenBountyApp(bountyAppId);
  return (
    <Link
      to="/bounties/$bountyId"
      params={{ bountyId: b.id }}
      className="group card-soft block p-5 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_oklch(0_0_0/0.18)]"
    >
      <div
        className={`flex aspect-[16/9] items-center justify-center rounded-2xl ${toneBg[b.tone]} text-6xl`}
      >
        {b.emoji}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className="pill bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          {b.category}
        </span>
        <span className="pill bg-mint/60 px-2.5 py-1 text-xs flex items-center gap-1">
          <Shield className="h-3 w-3" /> Escrow
        </span>
        {b.status && (
          <span className={`pill px-2.5 py-1 text-xs font-medium ${statusPillClass(b.status)}`}>
            {b.status}
          </span>
        )}
        {outdatedApp && (
          <span className="pill bg-amber-500/15 px-2.5 py-1 text-xs text-amber-900 dark:text-amber-200">
            App {bountyAppId}
          </span>
        )}
        {legacyAccept && b.status === "OPEN" && (
          <span className="pill bg-destructive/10 px-2.5 py-1 text-xs text-destructive">Legacy</span>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{b.title}</h3>
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">
            {b.funded} {assetLabel} funded
          </span>
          <span className="font-semibold">
            {b.goal} {assetLabel}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-6 w-6 rounded-full bg-ink" />
          <span>by {b.creator}</span>
        </div>
        <span className="pill bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground group-hover:bg-primary transition">
          Accept task →
        </span>
      </div>
    </Link>
  );
}
