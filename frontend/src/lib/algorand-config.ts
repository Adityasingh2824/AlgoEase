import algosdk from "algosdk";

/** Active escrow app — must match backend ALGORAND_APP_ID and deployed BoxMap contract. */
export const CURRENT_ESCROW_APP_ID = Number(
  import.meta.env.VITE_ALGORAND_APP_ID ?? "762856134",
);

export function getEscrowAppAddress(appId: number = CURRENT_ESCROW_APP_ID): string {
  return algosdk.getApplicationAddress(appId).toString();
}

/**
 * Testnet apps with a broken `accept_task` for open bounties (TEAL assert at pc=562).
 * Funds remain on-chain; clients should refund and recreate on CURRENT_ESCROW_APP_ID.
 */
/** Apps without `reject_work` or with broken open-bounty accept (use refund + recreate). */
export const LEGACY_OPEN_BOUNTY_APP_IDS: readonly number[] = [762836468];

export const LEGACY_NO_REJECT_APP_IDS: readonly number[] = [762836468, 762852258];

export function resolveEscrowAppId(stored?: string | number | null): number {
  const parsed = Number(stored);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return CURRENT_ESCROW_APP_ID;
}

export function isLegacyOpenBountyApp(appId: number): boolean {
  return LEGACY_OPEN_BOUNTY_APP_IDS.includes(appId);
}

export function isLegacyNoRejectApp(appId: number): boolean {
  return LEGACY_NO_REJECT_APP_IDS.includes(appId);
}

export function legacyBountyAcceptMessage(appId: number): string {
  return (
    `This bounty is on escrow app ${appId}, which cannot accept open bounties. ` +
    `If you posted it, use Request refund to recover your deposit, then create a new bounty on app ${CURRENT_ESCROW_APP_ID}.`
  );
}
