import { useMemo, useState } from "react";
import type { EscrowEvent, EscrowStatus } from "@/hooks/useEscrow";
import { mayBeImageDeliverable, parseDeliverableRef } from "@/lib/ipfs";
import { shortAddress } from "@/lib/bounties-api";
import { Copy, ExternalLink, FileText, ImageIcon } from "lucide-react";

type Props = {
  ipfsCid: string | null | undefined;
  events: EscrowEvent[];
  status?: EscrowStatus | string;
  freelancerAddress?: string | null;
  forClientReview?: boolean;
};

function cidFromEvents(events: EscrowEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.event_type !== "SUBMITTED") continue;
    const meta = ev.metadata;
    if (meta && typeof meta.ipfs_cid === "string" && meta.ipfs_cid.trim()) {
      return meta.ipfs_cid.trim();
    }
  }
  return null;
}

export function SubmittedWorkPanel({
  ipfsCid,
  events,
  status,
  freelancerAddress,
  forClientReview = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const deliverableRef = useMemo(() => {
    const fromBounty = ipfsCid?.trim();
    if (fromBounty) return fromBounty;
    return cidFromEvents(events);
  }, [ipfsCid, events]);

  const parsed = useMemo(
    () => (deliverableRef ? parseDeliverableRef(deliverableRef) : null),
    [deliverableRef],
  );

  if (!deliverableRef || !parsed) return null;

  const showPreview = parsed.href && mayBeImageDeliverable(parsed) && !imageFailed;
  const awaitingReview = status === "SUBMITTED" && forClientReview;
  const isOpenable = parsed.kind === "url" || parsed.kind === "ipfs";

  async function copyLabel() {
    try {
      await navigator.clipboard.writeText(parsed!.label);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card-soft overflow-hidden p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold">
            {forClientReview ? "Freelancer deliverable" : "Submitted work"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {awaitingReview
              ? "Review the submission below, then approve or reject in Escrow actions."
              : parsed.kind === "text"
                ? "Recorded on-chain as text (not a resolvable IPFS link)."
                : "Pinned on IPFS and recorded on-chain when work was submitted."}
          </p>
        </div>
      </div>

      {freelancerAddress && (
        <p className="mt-2 text-xs text-muted-foreground">
          Submitted by{" "}
          <span className="font-mono text-foreground">{shortAddress(freelancerAddress, 8, 6)}</span>
        </p>
      )}

      {showPreview && parsed.href && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            Preview
          </div>
          <img
            src={parsed.href}
            alt={`Deliverable ${parsed.label}`}
            className="max-h-80 w-full object-contain bg-card"
            onError={() => setImageFailed(true)}
          />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-background/80 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {parsed.kind === "url" ? "Deliverable link" : parsed.kind === "ipfs" ? "IPFS CID" : "On-chain note"}
        </p>
        <p className="mt-2 break-all font-mono text-sm text-foreground">{parsed.label}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLabel}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {isOpenable && parsed.href && (
          <a
            href={parsed.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Open deliverable
          </a>
        )}

        {isOpenable && parsed.kind === "ipfs" && parsed.gateways.length > 1 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Other gateways:</p>
            <div className="flex flex-wrap gap-2">
              {parsed.gateways.slice(1).map((gw) => (
                <a
                  key={gw.href}
                  href={gw.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {gw.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {parsed.kind === "text" && (
          <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">
            &quot;{parsed.label}&quot; is not a valid IPFS hash or URL, so gateways cannot load it. Ask the
            freelancer to resubmit with a <span className="font-mono">bafy…</span> CID from pinning their
            file, or a public <span className="font-mono">https://</span> link.
          </p>
        )}
      </div>
    </div>
  );
}
