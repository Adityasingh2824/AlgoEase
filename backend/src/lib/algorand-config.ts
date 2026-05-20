import algosdk from "algosdk";

/** Active escrow app — must match root .env and frontend VITE_ALGORAND_APP_ID. */
export function getCurrentEscrowAppId(): number {
  const raw =
    process.env.ALGORAND_APP_ID ??
    process.env.ESCROW_APP_ID ??
    process.env.VITE_ALGORAND_APP_ID ??
    "762856134";
  const appId = Number(raw);
  if (!Number.isFinite(appId) || appId <= 0) {
    throw new Error("ALGORAND_APP_ID must be a positive number (set in .env or backend/.env)");
  }
  return appId;
}

export const LEGACY_OPEN_BOUNTY_APP_IDS = [762836468] as const;
export const LEGACY_NO_REJECT_APP_IDS = [762836468, 762852258] as const;

export function getEscrowAppAddress(appId?: number): string {
  const id = appId ?? getCurrentEscrowAppId();
  return algosdk.getApplicationAddress(id).toString();
}

export function resolveBountyAppId(stored?: string | null): number {
  const parsed = Number(stored);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return getCurrentEscrowAppId();
}
