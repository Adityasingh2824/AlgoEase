import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { EscrowSteps } from "@/components/EscrowSteps";
import { getBounty } from "@/data/bounties";
import { X402Badge } from "@/components/X402Badge";
import { PaymentRequiredModal } from "@/components/PaymentRequiredModal";
import { CounterOfferModal } from "@/components/CounterOfferModal";
import { useApp } from "@/lib/app-context";
import type { WalletTxnKind } from "@/lib/wallet/wallet-service";
import {
  ArrowLeft,
  ArrowLeftRight,
  Flag,
  HandHelping,
  Info,
  Paperclip,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/bounties/$bountyId")({
  loader: ({ params }) => {
    const b = getBounty(params.bountyId);
    if (!b) throw notFound();
    return b;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — AlgoEase` : "Bounty — AlgoEase" },
      { name: "description", content: loaderData?.title ?? "Bounty on AlgoEase" },
      { property: "og:title", content: loaderData?.title ?? "AlgoEase bounty" },
      {
        property: "og:description",
        content: `Funded in AlgoPy-powered escrow on Algorand. ${loaderData?.goal ?? ""} ALGO goal.`,
      },
    ],
  }),
  component: BountyDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Couldn't load this bounty</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-4 pill bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => {
    const { bountyId } = Route.useParams();
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Bounty not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">No bounty matches "{bountyId}".</p>
          <Link to="/bounties" className="mt-4 inline-block pill bg-ink px-4 py-2 text-sm text-ink-foreground">
            Browse bounties
          </Link>
        </div>
      </div>
    );
  },
});

const toneBg: Record<string, string> = {
  mint: "from-mint to-lilac",
  lemon: "from-lemon to-blush",
  blush: "from-blush to-lilac",
  lilac: "from-lilac to-mint",
};

function discussionForBounty(title: string, category: string) {
  return {
    author:
      category === "Shoutout"
        ? `Hey! I need a shoutout for my Algorand project — happy to share talking points and assets.`
        : `Here's the scope for "${title}". Let me know your timeline and how you'd approach delivery.`,
    builder:
      category === "Audit"
        ? `I can deliver a written report plus an AlgoPy-focused review within a few days.`
        : `I'm interested — I can start right away once escrow is confirmed.`,
  };
}

function BountyDetail() {
  const b = Route.useLoaderData();
  const pct = Math.min(100, Math.round((b.funded / b.goal) * 100));
  const { author: authorMsg, builder: builderMsg } = useMemo(
    () => discussionForBounty(b.title, b.category),
    [b.title, b.category],
  );

  const { mode } = useApp();
  const isAgent = mode === "agent";
  const [payOpen, setPayOpen] = useState(false);
  const [payAction, setPayAction] = useState("POST /api/bounties/accept");
  const [payCost, setPayCost] = useState(0.1);
  const [payTxnKind, setPayTxnKind] = useState<WalletTxnKind>("x402_deposit");
  const [counterOpen, setCounterOpen] = useState(false);

  const onBackBounty = () => {
    setPayAction("POST /api/bounties/accept");
    setPayCost(0.1);
    setPayTxnKind("x402_deposit");
    setPayOpen(true);
  };

  const onApprove = () => {
    setPayAction("POST /api/bounties/approve");
    setPayCost(0.001);
    setPayTxnKind("approve");
    setPayOpen(true);
  };

  const onRefund = () => {
    setPayAction("POST /api/bounties/refund");
    setPayCost(0.001);
    setPayTxnKind("refund");
    setPayOpen(true);
  };

  const offeredAlgo = Math.min(b.funded, b.goal);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-20">
        <Link
          to="/bounties"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to open bounties
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <X402Badge />
          {isAgent && <X402Badge variant="required" />}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-10">
          {/* —— Main column —— */}
          <div className="space-y-6">
            <div className="card-soft overflow-hidden p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm text-muted-foreground">
                <p>
                  Bounty from: <span className="font-semibold text-foreground">{b.creator}</span>
                </p>
                <time dateTime="2026-08-04" className="shrink-0 tabular-nums">
                  Aug 4
                </time>
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                {b.title}
              </h1>

              <div className="mt-8 rounded-2xl border border-border bg-card/60 p-5 md:p-6">
                <h2 className="text-center font-display text-sm font-semibold text-foreground">Discussion</h2>

                <div className="mt-6 space-y-6">
                  <Message name="Author" date="Aug 4" text={authorMsg} />
                  <Message name="Builder" date="Aug 4" text={builderMsg} />

                  <div className="flex gap-3 rounded-2xl bg-lilac/35 px-4 py-3.5 dark:bg-lilac/20">
                    <HandHelping className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm leading-relaxed text-foreground/90">
                      Help this bounty reach its funding goal by backing it. You&apos;re only charged if the work is
                      approved.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
                  <input
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="Enter chat"
                    aria-label="Chat message"
                  />
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Attach">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-primary p-2.5 text-primary-foreground hover:opacity-90"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {!isAgent ? (
                    <>
                      <button
                        type="button"
                        onClick={onBackBounty}
                        className="inline-flex items-center justify-center gap-2 pill bg-mint px-5 py-2.5 text-sm font-semibold text-mint-foreground hover:opacity-95 transition"
                      >
                        <HandHelping className="h-4 w-4" />
                        Back this bounty
                      </button>
                      <button
                        type="button"
                        className="pill border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
                      >
                        Join the conversation
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onApprove}
                        className="inline-flex items-center justify-center gap-2 pill bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground hover:opacity-95 transition"
                      >
                        <Flag className="h-4 w-4" />
                        Mark as complete
                      </button>
                      <button
                        type="button"
                        onClick={onRefund}
                        className="pill border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted transition"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <EscrowSteps current={2} />
          </div>

          {/* —— Sidebar —— */}
          <aside className="space-y-4 lg:pt-1">
            {!isAgent ? (
              <>
                <button
                  type="button"
                  onClick={onBackBounty}
                  className="w-full pill bg-mint py-3.5 text-sm font-semibold text-mint-foreground shadow-sm hover:opacity-95 transition"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <HandHelping className="h-4 w-4" />
                    Back this bounty
                  </span>
                </button>
                <button
                  type="button"
                  className="w-full pill border border-border bg-card py-3.5 text-sm font-semibold hover:bg-muted transition"
                >
                  Join the conversation
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  className="w-full pill bg-ink py-3.5 text-sm font-semibold text-ink-foreground hover:opacity-95 transition"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <Flag className="h-4 w-4" />
                    Mark as complete
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onRefund}
                  className="w-full pill border border-border bg-card py-3.5 text-sm font-semibold hover:bg-muted transition"
                >
                  Decline
                </button>
                <div className="relative overflow-hidden rounded-3xl bg-lilac/40 p-5 dark:bg-lilac/25">
                  <span className="text-2xl leading-none" aria-hidden>
                    🙂
                  </span>
                  <p className="mt-3 font-display text-2xl font-bold tabular-nums">{offeredAlgo} ALGO</p>
                  <p className="text-sm text-muted-foreground">total offered</p>
                  <button
                    type="button"
                    onClick={() => setCounterOpen(true)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-semibold hover:bg-muted transition"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    Counter offer
                  </button>
                </div>
                <button
                  type="button"
                  className="w-full pill border border-border bg-card py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  Contact support
                </button>
              </>
            )}

            <div className={`overflow-hidden rounded-3xl bg-gradient-to-br p-1 shadow-sm ${toneBg[b.tone] ?? toneBg.lilac}`}>
              <div className="flex aspect-square items-center justify-center rounded-[1.35rem] bg-card text-7xl">
                {b.emoji}
              </div>
            </div>

            <div className="card-soft p-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium tabular-nums text-muted-foreground">{b.funded} ALGO</span>
                <span className="font-display text-2xl font-bold tabular-nums">{b.goal} ALGO</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">funded · goal</p>

              <div className="relative mt-4 h-3 w-full overflow-visible rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
                <span
                  className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-base drop-shadow-sm"
                  style={{ left: `${Math.max(8, Math.min(92, pct))}%` }}
                  aria-hidden
                >
                  🙂
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{b.backers} backers</span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Escrow
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Funding goal applied
              </div>
            </div>

            <div className="card-soft p-5">
              <div className="text-center font-display text-sm font-semibold">Backers</div>
              <ul className="mt-4 space-y-3">
                {[
                  { n: "Britney J.", h: "@britney.algo", a: 20 },
                  { n: "Marcus T.", h: "@marcust", a: 50 },
                  { n: "Yuki K.", h: "@yukik", a: 30 },
                ].map((u) => (
                  <li key={u.h} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-blush to-lemon" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{u.n}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.h}</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{u.a} ALGO</span>
                  </li>
                ))}
              </ul>
            </div>

            {isAgent && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                <Sparkles className="mx-auto mb-2 h-4 w-4 text-primary" />
                Builder view: counter offers and completion actions use AlgoPy escrow rules on-chain.
              </div>
            )}
          </aside>
        </div>
      </div>

      <PaymentRequiredModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        action={payAction}
        cost={payCost}
        transactionKind={payTxnKind}
      />
      <CounterOfferModal open={counterOpen} onClose={() => setCounterOpen(false)} requestedAlgo={b.goal} />
    </div>
  );
}

function Message({ name, date, text }: { name: string; date: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-primary to-lilac ring-2 ring-background" />
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-semibold">{name}</span>
          <span className="ml-2 text-xs text-muted-foreground">{date}</span>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{text}</p>
      </div>
    </div>
  );
}
