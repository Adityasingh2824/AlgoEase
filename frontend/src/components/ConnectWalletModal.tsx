import { Loader2, Wallet } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function ConnectWalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectWallet, walletStatus, walletError } = useApp();

  if (!open) return null;

  const isConnecting = walletStatus === "connecting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md card-soft p-6">
        <h3 className="font-display text-xl font-bold">Connect wallet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a wallet provider. Desktop uses QR flow, mobile uses deep links.
        </p>

        <div className="mt-5 grid gap-3">
          <WalletOption
            title="Pera Wallet"
            subtitle="Primary"
            disabled={isConnecting}
            onClick={async () => {
              try {
                await connectWallet("pera");
                onClose();
              } catch {
                // keep modal open to show error state
              }
            }}
          />
          <WalletOption
            title="Defly Wallet"
            subtitle="Secondary"
            disabled={isConnecting}
            onClick={async () => {
              try {
                await connectWallet("defly");
                onClose();
              } catch {
                // keep modal open to show error state
              }
            }}
          />
        </div>

        {isConnecting && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
          </div>
        )}
        {walletError && <p className="mt-4 text-sm text-destructive">{walletError}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="pill border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletOption({
  title,
  subtitle,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <Wallet className="h-4 w-4 text-primary" />
    </button>
  );
}
