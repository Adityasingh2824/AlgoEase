import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { ConnectWalletModal } from "@/components/ConnectWalletModal";
import { EscrowSteps } from "@/components/EscrowSteps";
import { EscrowActionPanel } from "@/components/EscrowActionPanel";
import { SubmittedWorkPanel } from "@/components/SubmittedWorkPanel";
import { getBounty } from "@/data/bounties";
import type { Bounty } from "@/components/BountyCard";
import { X402Badge } from "@/components/X402Badge";
import { PaymentRequiredModal } from "@/components/PaymentRequiredModal";
import { useApp } from "@/lib/app-context";
import { useCreateBountyFunding } from "@/hooks/useX402Payment";
import { useEscrow } from "@/hooks/useEscrow";
import { useEscrowActions } from "@/hooks/useEscrowActions";
import { formatBountyAsset, mapApiBountyToCard, shortAddress, statusPillClass } from "@/lib/bounties-api";
import { sameAlgorandAddress } from "@/lib/algorand-address";
import {
  CURRENT_ESCROW_APP_ID,
  isLegacyNoRejectApp,
  isLegacyOpenBountyApp,
  legacyBountyAcceptMessage,
  resolveEscrowAppId,
} from "@/lib/algorand-config";
import { ArrowLeft, ExternalLink, Info, Loader2, Shield } from "lucide-react";
import { isValidDeliverableRef, parseDeliverableRef } from "@/lib/ipfs";

const toneBg: Record<string, string> = {
  mint: "from-mint to-lilac",
  lemon: "from-lemon to-blush",
  blush: "from-blush to-lilac",
  lilac: "from-lilac to-mint",
};

export const Route = createFileRoute("/bounties/$bountyId")({
  component: BountyDetail,
});

function BountyDetail() {
  const { bountyId } = Route.useParams();
  const { walletAddress } = useApp();
  const escrow = useEscrow(bountyId);
  const actions = useEscrowActions(bountyId, escrow.refetch);
  const funding = useCreateBountyFunding();

  const staticBounty = getBounty(bountyId);
  const display: Bounty | null = useMemo(() => {
    if (escrow.bounty) return mapApiBountyToCard(escrow.bounty);
    if (staticBounty) return staticBounty;
    return null;
  }, [escrow.bounty, staticBounty]);

  const hasOnChain = Boolean(escrow.bounty);
  const escrowStatus = escrow.bounty?.status;
  const assetLabel = formatBountyAsset(escrow.bounty?.asset);
  const goal = display?.goal ?? Number(escrow.bounty?.amount ?? 0);
  const funded = hasOnChain ? goal : (display?.funded ?? 0);
  const pct = goal > 0 ? Math.min(100, Math.round((funded / goal) * 100)) : 0;

  const clientAddress = escrow.bounty?.client_address ?? "";
  const assignedFreelancer = escrow.bounty?.freelancer_address ?? null;
  const isClient =
    hasOnChain && Boolean(walletAddress) && sameAlgorandAddress(walletAddress, clientAddress);
  const isAssignedFreelancer =
    Boolean(assignedFreelancer) &&
    Boolean(walletAddress) &&
    sameAlgorandAddress(walletAddress, assignedFreelancer);

  const bountyAppId = resolveEscrowAppId(escrow.bounty?.app_id);
  const legacyEscrowApp = hasOnChain && isLegacyOpenBountyApp(bountyAppId);
  const legacyNoReject = hasOnChain && isLegacyNoRejectApp(bountyAppId);
  const appConfigMismatch = hasOnChain && bountyAppId !== CURRENT_ESCROW_APP_ID;

  const showAccept =
    hasOnChain &&
    escrowStatus === "OPEN" &&
    !isClient &&
    !assignedFreelancer &&
    !legacyEscrowApp;
  const showSubmit = hasOnChain && escrowStatus === "ACCEPTED" && isAssignedFreelancer;

  const showSubmittedWork =
    hasOnChain &&
    Boolean(escrow.bounty?.ipfs_cid || escrow.events.some((e) => e.event_type === "SUBMITTED")) &&
    ["SUBMITTED", "APPROVED", "RELEASED", "REJECTED"].includes(escrowStatus ?? "");

  const [payOpen, setPayOpen] = useState(false);
  const [payAction, setPayAction] = useState("");
  const [payCost, setPayCost] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [ipfsCid, setIpfsCid] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const modalAsset = funding.challenge?.asset ?? escrow.bounty?.asset ?? "ALGO";
  const busy =
    actions.busy ??
    (funding.stage === "signing" || funding.stage === "submitting" ? "fund" : null);

  useEffect(() => {
    if (funding.stage === "success") {
      escrow.refetch();
      setPayOpen(false);
      funding.reset();
    }
  }, [funding.stage, escrow.refetch, funding.reset]);

  function resolveFundAsset(asset?: string | null): string {
    if (!asset || asset === "ALGO") return "ALGO";
    if (asset === "USDC" || asset === "USDC-A") {
      return import.meta.env.VITE_USDC_ASSET_ID ?? "10458941";
    }
    return asset;
  }

  const onFund = async () => {
    setActionError(null);
    if (!walletAddress) {
      setActionError("Connect your wallet to fund this escrow.");
      return;
    }
    setPayAction("Escrow deposit");
    setPayCost(Math.round(goal * 1_000_000));
    setPayOpen(true);
    await funding.fund({
      task_id: bountyId,
      title: display?.title ?? `Bounty ${bountyId}`,
      description: escrow.bounty?.description ?? `Bounty: ${display?.title ?? bountyId}`,
      deadline_hours: 72,
      amount: String(goal),
      asset: resolveFundAsset(escrow.bounty?.asset),
    });
  };

  const onApprove = async () => {
    setActionError(null);
    if (!walletAddress) {
      setActionError("Connect your wallet as the client to approve work.");
      return;
    }
    if (!isClient) {
      setActionError("Only the bounty client can approve work.");
      return;
    }
    try {
      await actions.approveWork(walletAddress, bountyAppId);
      setActionSuccess("Work approved — you can release payment when ready.");
    } catch {
      /* surfaced via actions.error */
    }
  };

  const onReject = async () => {
    setActionError(null);
    if (!walletAddress) {
      setActionError("Connect your wallet as the client to reject this submission.");
      return;
    }
    if (!isClient) {
      setActionError("Only the bounty client can reject submitted work.");
      return;
    }
    if (escrowStatus !== "SUBMITTED") {
      setActionError("Work can only be rejected after the freelancer submits it.");
      return;
    }
    try {
      await actions.rejectWork(walletAddress, bountyAppId);
      setActionSuccess("Work rejected — escrow refunded to your wallet.");
    } catch {
      /* surfaced via actions.error */
    }
  };

  const onRefund = async () => {
    setActionError(null);
    if (!walletAddress) {
      setActionError("Connect your wallet as the client to request a refund.");
      return;
    }
    if (!isClient) {
      setActionError("Only the bounty client can request a refund.");
      return;
    }
    try {
      await actions.refundEscrow(walletAddress, bountyAppId);
      setActionSuccess("Refund submitted — funds return to your wallet.");
    } catch {
      /* surfaced via actions.error */
    }
  };

  const onAccept = async () => {
    setActionError(null);
    if (!walletAddress) {
      setActionError("Connect your wallet to accept this bounty.");
      return;
    }
    if (isClient) {
      setActionError("The client cannot accept their own bounty.");
      return;
    }
    try {
      await actions.acceptTask(walletAddress, bountyAppId);
      setActionSuccess("Bounty accepted — you can submit work when ready.");
    } catch {
      /* surfaced via actions.error */
    }
  };

  const onSubmit = () => setSubmitOpen(true);

  const confirmSubmit = async () => {
    const ref = ipfsCid.trim();
    if (!ref) {
      setActionError("Enter an IPFS CID or https:// link for your deliverable.");
      return;
    }
    if (!isValidDeliverableRef(ref)) {
      setActionError(
        "Use a valid IPFS CID (bafy… or Qm…) or a public https:// URL — placeholders like \"xyz\" cannot be opened.",
      );
      return;
    }
    if (!walletAddress || !isAssignedFreelancer) {
      setActionError("Connect your wallet as the assigned freelancer to submit work.");
      return;
    }
    setActionError(null);
    try {
      await actions.submitWork(walletAddress, ipfsCid.trim(), bountyAppId);
      setSubmitOpen(false);
      setIpfsCid("");
      setActionSuccess("Work submitted — waiting for client approval.");
    } catch {
      /* surfaced via actions.error */
    }
  };

  const onRelease = async () => {
    setActionError(null);
    if (!walletAddress) {
      setActionError("Connect your wallet as the client to release payment.");
      return;
    }
    if (!isClient) {
      setActionError("Only the bounty client can release payment.");
      return;
    }
    if (!assignedFreelancer) {
      setActionError("No freelancer is assigned to this bounty yet.");
      return;
    }
    try {
      await actions.releasePayment(walletAddress, assignedFreelancer, bountyAppId);
      setActionSuccess("Payment released to the freelancer.");
    } catch {
      /* surfaced via actions.error */
    }
  };

  const panelProps = {
    status: escrowStatus,
    isClient: !hasOnChain || isClient,
    walletConnected: Boolean(walletAddress),
    showAccept,
    showSubmit,
    hasOnChain,
    busy,
    onFund: !hasOnChain ? onFund : undefined,
    onAccept: showAccept ? onAccept : undefined,
    onSubmit: showSubmit ? onSubmit : undefined,
    onApprove: hasOnChain && isClient && escrowStatus === "SUBMITTED" ? onApprove : undefined,
    onReject:
      hasOnChain && isClient && escrowStatus === "SUBMITTED" && !legacyNoReject
        ? onReject
        : undefined,
    onRelease: hasOnChain && isClient ? onRelease : undefined,
    onRefund:
      hasOnChain && isClient && (escrowStatus === "OPEN" || escrowStatus === "ACCEPTED")
        ? onRefund
        : undefined,
    onConnectWallet: () => setWalletModalOpen(true),
  };

  if (escrow.loading && !display) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading escrow…</p>
        </div>
      </div>
    );
  }

  if (!display) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Bounty not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">{escrow.error ?? "No matching bounty."}</p>
          <Link to="/bounties" className="mt-4 inline-block pill bg-ink px-4 py-2 text-sm text-ink-foreground">
            Browse bounties
          </Link>
        </div>
      </div>
    );
  }

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
          {escrowStatus && (
            <span className={`pill px-3 py-1 text-xs font-semibold ${statusPillClass(escrowStatus)}`}>
              {escrowStatus}
            </span>
          )}
          <span className="pill bg-muted px-3 py-1 text-xs font-mono">Escrow app {bountyAppId}</span>
          {appConfigMismatch && (
            <span className="pill bg-amber-500/15 px-3 py-1 text-xs text-amber-900 dark:text-amber-200">
              UI configured for app {CURRENT_ESCROW_APP_ID}
            </span>
          )}
        </div>

        {legacyEscrowApp && (
          <div
            className="mt-3 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
            role="status"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{legacyBountyAcceptMessage(bountyAppId)}</p>
          </div>
        )}

        {legacyNoReject && escrowStatus === "SUBMITTED" && isClient && (
          <div
            className="mt-3 flex gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
            role="status"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Reject work is only available on app {CURRENT_ESCROW_APP_ID}. This bounty is on app{" "}
              {bountyAppId} — use Request refund after the deadline, or post a new bounty.
            </p>
          </div>
        )}

        {(actionError || actions.error || funding.error) && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {actionError ?? actions.error ?? funding.error}
          </p>
        )}

        {actionSuccess && (
          <p className="mt-3 text-sm font-medium text-mint-foreground" role="status">
            {actionSuccess}
          </p>
        )}

        {!walletAddress && hasOnChain && showAccept && (
          <p className="mt-3 text-sm text-muted-foreground">
            Connect a wallet that is not the client to accept this bounty. You will sign an on-chain{" "}
            <code className="text-xs">accept_task</code> transaction in Pera or Defly.
          </p>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-10">
          <div className="space-y-6">
            <div className="card-soft overflow-hidden p-6 md:p-8">
              <p className="text-sm text-muted-foreground">
                {hasOnChain ? (
                  <>
                    Client: <span className="font-mono text-foreground">{shortAddress(clientAddress, 8, 6)}</span>
                    {" · "}
                    Freelancer:{" "}
                    <span className="font-mono text-foreground">
                      {assignedFreelancer ? shortAddress(assignedFreelancer, 8, 6) : "Open — anyone can accept"}
                    </span>
                  </>
                ) : (
                  <>Demo listing · fund to create on-chain escrow (task id: {bountyId})</>
                )}
              </p>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                {display.title}
              </h1>
              {escrow.bounty?.description && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{escrow.bounty.description}</p>
              )}

              {showSubmittedWork && (
                <div className="mt-8">
                  <SubmittedWorkPanel
                    ipfsCid={escrow.bounty?.ipfs_cid}
                    events={escrow.events}
                    status={escrowStatus}
                    freelancerAddress={assignedFreelancer}
                    forClientReview={isClient}
                  />
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-border bg-card/60 p-5 md:p-6">
                <h2 className="font-display text-sm font-semibold">Escrow actions</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isClient && "You are the client. "}
                  {showAccept && !isClient && "Freelancers can accept with a connected wallet (not the client). "}
                  {showSubmit && "Submit your deliverable IPFS CID on-chain. "}
                  {!isClient && !showAccept && !showSubmit && hasOnChain &&
                    "Connect a wallet to act on this bounty. "}
                  Client deposits use x402; approve, reject, release, and refund are signed in your wallet.
                </p>
                <div className="mt-5">
                  <EscrowActionPanel {...panelProps} />
                </div>

                {submitOpen && (
                  <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-4">
                    <label className="block text-sm font-medium">Deliverable IPFS CID</label>
                    <input
                      value={ipfsCid}
                      onChange={(e) => setIpfsCid(e.target.value)}
                      placeholder="bafy… or https://..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none ring-primary/20 focus:ring"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={confirmSubmit}
                        className="pill bg-mint px-4 py-2 text-sm font-semibold text-mint-foreground"
                      >
                        Submit on-chain
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmitOpen(false)}
                        className="pill border border-border px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <EscrowSteps status={escrowStatus} />

            {escrow.events.length > 0 && (
              <div className="card-soft p-5">
                <h3 className="font-display text-sm font-semibold">On-chain events</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {escrow.events.map((ev) => {
                    const submittedCid =
                      ev.event_type === "SUBMITTED" &&
                      ev.metadata &&
                      typeof ev.metadata.ipfs_cid === "string"
                        ? ev.metadata.ipfs_cid
                        : null;
                    const deliverable = submittedCid ? parseDeliverableRef(submittedCid) : null;
                    return (
                      <li
                        key={ev.id}
                        className="border-b border-border/60 pb-2 last:border-0"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{ev.event_type}</span>
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {ev.tx_id ? `${ev.tx_id.slice(0, 12)}…` : "—"}
                          </span>
                        </div>
                        {deliverable?.href && (
                          <a
                            href={deliverable.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View deliverable
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:pt-1">
            <EscrowActionPanel compact {...panelProps} />

            <div
              className={`overflow-hidden rounded-3xl bg-gradient-to-br p-1 shadow-sm ${toneBg[display.tone] ?? toneBg.lilac}`}
            >
              <div className="flex aspect-square items-center justify-center rounded-[1.35rem] bg-card text-7xl">
                {display.emoji}
              </div>
            </div>

            <div className="card-soft p-5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {funded} {assetLabel}
                </span>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {goal} {assetLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">in escrow · goal</p>
              <div className="relative mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{hasOnChain ? "Funded on-chain" : "Not funded yet"}</span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3" /> BoxMap escrow
                </span>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Contract app ID {bountyAppId}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ConnectWalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />

      <PaymentRequiredModal
        open={payOpen}
        onClose={() => {
          setPayOpen(false);
          funding.reset();
        }}
        action={payAction}
        cost={payCost}
        asset={modalAsset}
        stage={funding.stage}
        txId={funding.txId}
        error={funding.error}
        payTo={funding.challenge?.payTo}
      />
    </div>
  );
}
