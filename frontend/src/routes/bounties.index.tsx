import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { BountyCard } from "@/components/BountyCard";
import { bounties } from "@/data/bounties";
import { X402Badge } from "@/components/X402Badge";
import { useApp } from "@/lib/app-context";
import { Plus } from "lucide-react";

const cats = ["All", "Smart Contract", "Design", "Tutorial", "1-on-1 Help", "Audit", "Shoutout"];

export const Route = createFileRoute("/bounties/")({
  head: () => ({
    meta: [
      { title: "Bounties — AlgoEase" },
      { name: "description", content: "Browse open bounties funded in AlgoPy-powered Algorand escrow." },
      { property: "og:title", content: "Bounties — AlgoEase" },
      { property: "og:description", content: "Browse open bounties funded in AlgoPy-powered Algorand escrow." },
    ],
  }),
  component: BountiesIndexPage,
});

function BountiesIndexPage() {
  const { mode } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold md:text-5xl">
              Open <span className="highlight-lemon">bounties</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Pick a task, deliver, and get paid automatically by the contract.</p>
            <div className="mt-3 flex items-center gap-2">
              <X402Badge />
              {mode === "agent" && <X402Badge variant="required" />}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/create-bounty" })}
            className="inline-flex items-center gap-2 pill bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" /> Post a bounty
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {cats.map((c, i) => (
            <button
              key={c}
              type="button"
              className={`pill px-4 py-2 text-sm transition ${
                i === 0 ? "bg-ink text-ink-foreground" : "bg-card text-foreground hover:bg-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bounties.map((b) => (
            <BountyCard key={b.id} b={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
