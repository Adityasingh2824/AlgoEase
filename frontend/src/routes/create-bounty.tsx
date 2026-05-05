import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { ArrowLeft, CircleDollarSign, ShieldCheck, Sparkles, Wallet } from "lucide-react";

export const Route = createFileRoute("/create-bounty")({
  head: () => ({
    meta: [
      { title: "Create bounty — AlgoEase" },
      { name: "description", content: "Create a new AlgoEase bounty powered by AlgoPy contracts." },
      { property: "og:title", content: "Create bounty — AlgoEase" },
      { property: "og:description", content: "Post a new bounty with secure AlgoPy-powered escrow." },
    ],
  }),
  component: CreateBountyPage,
});

const categories = ["Smart Contract", "Design", "Tutorial", "Audit", "Growth", "Research"];

function CreateBountyPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Smart Contract");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("200");
  const [deadline, setDeadline] = useState("");

  const progress = useMemo(() => {
    const score = [title, category, description, budget, deadline].filter(Boolean).length;
    return Math.round((score / 5) * 100);
  }, [title, category, description, budget, deadline]);

  return (
    <div className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-20">
        <div className="mb-5">
          <Link to="/bounties" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to bounties
          </Link>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">Create a <span className="highlight-lemon">new bounty</span></h1>
          <p className="mt-2 text-muted-foreground">
            Modern Algorand development stack with secure, Pythonic smart contract logic on AlgoPy.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <form className="card-soft p-6 md:p-8">
            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Bounty title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Build AlgoPy vesting contract with tests"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={`pill px-4 py-2 text-sm transition ${category === item ? "bg-ink text-ink-foreground" : "bg-card border hover:bg-muted"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">What needs to be delivered?</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={7}
                  placeholder="Write scope, acceptance criteria, and expected deliverables..."
                  className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Budget (ALGO)</label>
                  <input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    type="number"
                    min="1"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Deadline</label>
                  <input
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    type="date"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button type="button" className="pill bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
                  Continue to funding
                </button>
                <Link to="/bounties" className="pill border bg-card px-6 py-3 text-sm font-medium hover:bg-muted transition">
                  Save draft
                </Link>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="card-soft p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold">Live preview</h3>
                <span className="pill bg-mint px-3 py-1 text-xs font-medium text-mint-foreground">{progress}% complete</span>
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs text-muted-foreground">{category}</div>
                <div className="mt-1 font-semibold">{title || "Your bounty title appears here"}</div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-4">
                  {description || "Add details to preview your bounty card and scope summary."}
                </p>
                <div className="mt-4 h-2 w-full rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Goal</span>
                  <span className="font-semibold">{budget || "0"} ALGO</span>
                </div>
              </div>
            </div>

            <div className="card-soft p-5">
              <div className="space-y-3 text-sm">
                <div className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Powered by AlgoPy smart contracts
                </div>
                <div className="inline-flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Pera Wallet support (Defly optional)
                </div>
                <div className="inline-flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-primary" />
                  4.5s finality and low fees on Algorand
                </div>
                <div className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Escrow funds are released on approval
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
