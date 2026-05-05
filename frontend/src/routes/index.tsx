import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { FloatingCards } from "@/components/FloatingCards";
import { Marquee } from "@/components/Marquee";
import { BountyCard } from "@/components/BountyCard";
import { EscrowSteps } from "@/components/EscrowSteps";
import { bounties } from "@/data/bounties";
import { Shield, Zap, Lock } from "lucide-react";
import { DevPanel } from "@/components/DevPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlgoEase — Modern Algorand bounties" },
      { name: "description", content: "Powered by AlgoPy smart contracts on Algorand. Post bounties, ship work, and get paid automatically." },
      { property: "og:title", content: "AlgoEase — Modern Algorand escrow" },
      { property: "og:description", content: "Secure, Pythonic smart contract logic on Algorand with wallet-first payouts." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 pill bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Powered by AlgoPy smart contracts
            </div>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] md:text-6xl">
              Earn money from <br />
              tasks <span className="highlight-lemon">securely</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              Secure, Pythonic smart contract logic on Algorand. AlgoEase locks payments in escrow and auto-releases funds when work is approved.
            </p>

            <div className="mt-8 flex max-w-md items-center gap-2 rounded-full bg-card p-1.5 shadow-[0_10px_30px_-12px_oklch(0_0_0/0.15)]">
              <span className="pl-4 text-sm text-muted-foreground">algoease.app/</span>
              <input
                placeholder="yourname"
                className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button className="pill bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                Claim profile →
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">Built with AlgoPy</span>
              <span className="inline-flex items-center gap-1.5">Algorand Native</span>
              <span className="inline-flex items-center gap-1.5">4.5s Finality • Low Fees</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Funds locked in escrow</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Auto-released on approval</span>
            </div>
          </div>

          <FloatingCards />
        </div>
      </section>

      <Marquee />

      {/* FEATURED BOUNTIES */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Live bounties</h2>
            <p className="mt-2 text-muted-foreground">Funds already in escrow. Pick one and get paid on completion.</p>
          </div>
          <Link to="/bounties" className="hidden md:inline-flex pill bg-ink px-4 py-2 text-sm font-medium text-ink-foreground">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bounties.slice(0, 6).map((b) => <BountyCard key={b.id} b={b} />)}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">A trustless way <br />to get work done.</h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Modern Algorand development stack with AlgoPy as the primary smart contract language. Clients fund escrow upfront, builders start with confidence.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="card-soft p-5">
                <Shield className="h-6 w-6 text-primary" />
                <h4 className="mt-3 font-semibold">No middleman</h4>
                <p className="mt-1 text-sm text-muted-foreground">AlgoPy contracts hold and release funds. AlgoEase never touches your money.</p>
              </div>
              <div className="card-soft p-5">
                <Zap className="h-6 w-6 text-primary" />
                <h4 className="mt-3 font-semibold">Wallet-first payouts</h4>
                <p className="mt-1 text-sm text-muted-foreground">Fast settlement on Algorand with Pera Wallet support and optional Defly integration.</p>
              </div>
            </div>
          </div>
          <EscrowSteps current={2} />
        </div>
      </section>

      <DevPanel />

      <Footer />
    </div>
  );
}



function Footer() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary" />
          <span className="font-display text-lg font-bold">algoease</span>
        </div>
        <p className="text-sm opacity-70">© 2026 AlgoEase. Trustless escrow on Algorand.</p>
      </div>
    </footer>
  );
}
