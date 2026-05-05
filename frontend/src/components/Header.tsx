import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "./Logo";
import { LogOut, Search, Wallet } from "lucide-react";
import { ModeToggle, ThemeToggle } from "./Toggles";
import { ConnectWalletModal } from "./ConnectWalletModal";
import { useApp } from "@/lib/app-context";

export function Header() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { walletAddress, walletBalanceAlgo, disconnectWallet, walletType } = useApp();
  const isConnected = Boolean(walletAddress);
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="sticky top-4 z-40 mx-auto max-w-6xl px-4">
      <div className="flex items-center justify-between gap-3 rounded-full bg-card/90 px-3 py-2 shadow-[0_8px_30px_-12px_oklch(0_0_0/0.15)] backdrop-blur">
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded-full px-2 py-1">
            <Logo />
          </Link>
          <Link
            to="/bounties"
            className="inline-flex pill border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition sm:px-4"
          >
            Bounties
          </Link>
          <Link
            to="/create-bounty"
            className="hidden md:inline-flex pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            + Post a bounty
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 pill bg-muted px-4 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Find a bounty</span>
          </div>
          <div className="hidden sm:block"><ModeToggle /></div>
          <ThemeToggle />
          {!isConnected ? (
            <button
              type="button"
              onClick={() => setWalletModalOpen(true)}
              className="inline-flex items-center gap-2 pill bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90 transition"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 pill bg-ink px-4 py-2 text-sm font-medium text-ink-foreground hover:opacity-90 transition"
              >
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {shortAddress} · {walletBalanceAlgo?.toFixed(3) ?? "0.000"} ALGO
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-border bg-card p-3 shadow-lg">
                  <p className="text-xs text-muted-foreground">Connected wallet</p>
                  <p className="mt-1 text-sm font-semibold">{walletType === "pera" ? "Pera Wallet" : "Defly Wallet"}</p>
                  <p className="mt-1 text-xs text-muted-foreground break-all">{walletAddress}</p>
                  <p className="mt-2 text-sm font-medium">{walletBalanceAlgo?.toFixed(3) ?? "0.000"} ALGO</p>
                  <button
                    type="button"
                    onClick={async () => {
                      await disconnectWallet();
                      setMenuOpen(false);
                    }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 pill border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4" /> Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ConnectWalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </header>
  );
}
