import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { PaymentRequiredModal } from "@/components/PaymentRequiredModal";
import { useApp } from "@/lib/app-context";
import { CURRENT_ESCROW_APP_ID } from "@/lib/algorand-config";
import { useCreateBountyFunding } from "@/hooks/useX402Payment";
import { ArrowLeft, CircleDollarSign, Loader2, ShieldCheck, Sparkles, Wallet } from "lucide-react";

export const Route = createFileRoute("/create-bounty")({
  head: () => ({
    meta: [
      { title: "Create bounty — AlgoEase" },
      { name: "description", content: "Create a new AlgoEase bounty powered by AlgoPy contracts." },
    ],
  }),
  component: CreateBountyPage,
});

const categories = ["Smart Contract", "Design", "Tutorial", "Audit", "Growth", "Research"];

function CreateBountyPage() {
  const navigate = useNavigate();
  const { walletAddress } = useApp();
  const x402 = useCreateBountyFunding();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Smart Contract");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("5");
  const [deadline, setDeadline] = useState("");
  const [asset, setAsset] = useState<"ALGO" | "USDC">("ALGO");
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const taskId = useMemo(() => crypto.randomUUID(), []);

  const deadlineHours = useMemo(() => {
    if (!deadline) return 168;
    const end = new Date(deadline).getTime();
    const diff = Math.max(end - Date.now(), 3600_000);
    return Math.ceil(diff / 3_600_000);
  }, [deadline]);

  const progress = useMemo(() => {
    const score = [title, category, description, budget, deadline].filter(Boolean).length;
    return Math.round((score / 5) * 100);
  }, [title, category, description, budget, deadline]);

  const modalAsset = x402.challenge?.asset ?? asset;

  const onFund = async () => {
    setError(null);
    if (!walletAddress) {
      setError("Connect your wallet before funding the escrow.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setPayOpen(true);
    const result = await x402.fund({
      task_id: taskId,
      title: title.trim(),
      description: description.trim(),
      deadline_hours: deadlineHours,
      amount: budget,
      asset: asset === "USDC" ? import.meta.env.VITE_USDC_ASSET_ID ?? "10458941" : "ALGO",
    });

    if (result) {
      setPayOpen(false);
      x402.reset();
      navigate({ to: "/bounties/$bountyId", params: { bountyId: taskId } });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-20">
        <div className="mb-5">
          <Link
            to="/bounties"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to bounties
          </Link>
          <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">
            Create a <span className="highlight-lemon">new bounty</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Funds lock in the BoxMap escrow contract (app {CURRENT_ESCROW_APP_ID}) via x402.
            Freelancers discover your bounty on the board and accept with their wallet.
          </p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <form
            className="card-soft p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              void onFund();
            }}
          >
            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Bounty title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Build AlgoPy vesting contract with tests"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                  required
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
                  rows={6}
                  placeholder="Scope, acceptance criteria, and deliverables..."
                  className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Budget</label>
                  <input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Asset</label>
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value as "ALGO" | "USDC")}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none ring-primary/20 focus:ring"
                  >
                    <option value="ALGO">ALGO</option>
                    <option value="USDC">USDC-A</option>
                  </select>
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
                <button
                  type="submit"
                  disabled={x402.stage === "signing" || x402.stage === "submitting"}
                  className="inline-flex items-center gap-2 pill bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-60"
                >
                  {(x402.stage === "signing" || x402.stage === "submitting") && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Fund escrow via x402
                </button>
                <Link
                  to="/bounties"
                  className="pill border bg-card px-6 py-3 text-sm font-medium hover:bg-muted transition"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="card-soft p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-bold">Live preview</h3>
                <span className="pill bg-mint px-3 py-1 text-xs font-medium text-mint-foreground">
                  {progress}% complete
                </span>
              </div>
              <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4">
                <div className="text-xs text-muted-foreground">{category}</div>
                <div className="mt-1 font-semibold">{title || "Your bounty title"}</div>
                <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                  {description || "Add details to preview your bounty."}
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Goal</span>
                  <span className="font-semibold">
                    {budget || "0"} {asset === "ALGO" ? "ALGO" : "USDC-A"}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground break-all">task: {taskId}</p>
              </div>
            </div>

            <div className="card-soft space-y-3 p-5 text-sm">
              <div className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                BoxMap escrow on testnet
              </div>
              <div className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Pera / Defly wallet for x402 payment
              </div>
              <div className="inline-flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                Funds released after client approval
              </div>
              <div className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Escrow lifecycle synced to Supabase
              </div>
            </div>
          </aside>
        </div>
      </section>

      <PaymentRequiredModal
        open={payOpen}
        onClose={() => {
          setPayOpen(false);
          x402.reset();
        }}
        action="Escrow deposit"
        cost={Math.round(Number(budget || 0) * 1_000_000)}
        asset={modalAsset}
        stage={x402.stage}
        txId={x402.txId}
        error={x402.error ?? error}
        payTo={x402.challenge?.payTo}
      />
    </div>
  );
}
