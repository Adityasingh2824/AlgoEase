export type DeliverableKind = "url" | "ipfs" | "text";

export type DeliverableGateway = {
  name: string;
  href: string;
};

export type ParsedDeliverable = {
  kind: DeliverableKind;
  label: string;
  /** Primary link when openable (URL or first gateway). */
  href: string | null;
  gateways: DeliverableGateway[];
};

/** CIDv0 (Qm…) or CIDv1 (bafy…, bafk…, etc.). */
const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_V1 = /^baf[a-z2-7]{20,}$/i;

const GATEWAY_TEMPLATES = [
  { name: "IPFS.io", base: "https://ipfs.io/ipfs" },
  { name: "dweb.link", base: "https://dweb.link/ipfs" },
  { name: "Cloudflare", base: "https://cloudflare-ipfs.com/ipfs" },
] as const;

function gatewayBase(): string {
  const custom = import.meta.env.VITE_IPFS_GATEWAY?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return GATEWAY_TEMPLATES[0].base;
}

function buildIpfsGateways(path: string): DeliverableGateway[] {
  const normalized = path.replace(/^\/+/, "");
  const bases = new Set<string>([gatewayBase(), ...GATEWAY_TEMPLATES.map((g) => g.base)]);
  return [...bases].map((base, i) => ({
    name: GATEWAY_TEMPLATES[i]?.name ?? "Gateway",
    href: `${base}/${normalized}`,
  }));
}

/** Bare CID or `CID/sub/path` (directory / named file on IPFS). */
function extractIpfsPath(value: string): string | null {
  const trimmed = value.trim();
  if (CID_V0.test(trimmed) || CID_V1.test(trimmed)) return trimmed;

  const slash = trimmed.indexOf("/");
  if (slash <= 0) return null;
  const root = trimmed.slice(0, slash);
  if (!CID_V0.test(root) && !CID_V1.test(root)) return null;
  return trimmed;
}

/** Classify and build openable gateway/URL links for a deliverable reference. */
export function parseDeliverableRef(ref: string): ParsedDeliverable {
  const trimmed = ref.trim();
  if (!trimmed) {
    return { kind: "text", label: "", href: null, gateways: [] };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "url", label: trimmed, href: trimmed, gateways: [] };
  }

  if (trimmed.startsWith("ipfs://")) {
    const path = trimmed.slice("ipfs://".length).replace(/^\/+/, "");
    const gateways = buildIpfsGateways(path);
    return {
      kind: "ipfs",
      label: path,
      href: gateways[0]?.href ?? null,
      gateways,
    };
  }

  const ipfsPath = extractIpfsPath(trimmed);
  if (ipfsPath) {
    const gateways = buildIpfsGateways(ipfsPath);
    return {
      kind: "ipfs",
      label: trimmed,
      href: gateways[0]?.href ?? null,
      gateways,
    };
  }

  return { kind: "text", label: trimmed, href: null, gateways: [] };
}

/** @deprecated Use parseDeliverableRef */
export function resolveDeliverableLink(ref: string): { label: string; href: string } {
  const parsed = parseDeliverableRef(ref);
  return { label: parsed.label, href: parsed.href ?? "" };
}

export function ipfsGatewayUrl(cid: string): string {
  return parseDeliverableRef(cid).href ?? "";
}

export function isValidDeliverableRef(ref: string): boolean {
  const kind = parseDeliverableRef(ref).kind;
  return kind === "url" || kind === "ipfs";
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i;

export function mayBeImageDeliverable(parsed: ParsedDeliverable): boolean {
  if (parsed.kind === "url") return IMAGE_EXT.test(parsed.href ?? "");
  if (parsed.kind !== "ipfs" || !parsed.href) return false;
  return !parsed.label.endsWith(".json") && !parsed.label.includes("/");
}
