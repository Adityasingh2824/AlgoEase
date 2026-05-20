import type { Bounty } from "@/components/BountyCard";
import type { BountyData, EscrowStatus } from "@/hooks/useEscrow";

const EMOJIS = ["🧠", "🎨", "📚", "🤝", "🛡️", "📣"];
const TONES: Bounty["tone"][] = ["lilac", "blush", "mint", "lemon"];

export function formatBountyAsset(asset?: string | null): string {
  if (!asset || asset === "ALGO") return "ALGO";
  if (asset === "USDC" || asset === "USDC-A") return "USDC-A";
  return asset;
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function mapApiBountyToCard(b: BountyData, index = 0): Bounty {
  const amount = Number(b.amount) || 0;
  const isFunded = b.status !== "OPEN" || Boolean(b.deposit_tx_id);
  return {
    id: b.task_id,
    title: b.title,
    category: "On-chain",
    budget: amount,
    funded: isFunded ? amount : 0,
    goal: amount,
    backers: 1,
    creator: shortAddress(b.client_address),
    emoji: EMOJIS[index % EMOJIS.length],
    tone: TONES[index % TONES.length],
    status: b.status,
    asset: b.asset,
    appId: b.app_id,
  };
}

export function statusPillClass(status: EscrowStatus | string): string {
  switch (status) {
    case "OPEN":
      return "bg-lemon text-lemon-foreground";
    case "ACCEPTED":
      return "bg-lilac/80 text-foreground";
    case "SUBMITTED":
      return "bg-blush text-foreground";
    case "APPROVED":
      return "bg-primary/15 text-primary";
    case "RELEASED":
      return "bg-mint text-mint-foreground";
    case "REFUNDED":
      return "bg-muted text-muted-foreground";
    case "REJECTED":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}
