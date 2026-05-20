import { Router } from "express";
import {
  getCurrentEscrowAppId,
  getEscrowAppAddress,
  LEGACY_NO_REJECT_APP_IDS,
  LEGACY_OPEN_BOUNTY_APP_IDS,
} from "../lib/algorand-config.js";
import {
  ensureEscrowAppMbrSeed,
  getEscrowAppLiquidMicroAlgos,
} from "../services/algorand.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const escrowAppId = getCurrentEscrowAppId();
  let appLiquidity: Awaited<ReturnType<typeof getEscrowAppLiquidMicroAlgos>> | undefined;
  try {
    appLiquidity = await getEscrowAppLiquidMicroAlgos(escrowAppId);
  } catch {
    /* algod unavailable */
  }
  res.json({
    ok: true,
    service: "algoease-backend",
    version: "v2",
    network: process.env.ALGORAND_NETWORK ?? "testnet",
    escrowAppId,
    escrowAppAddress: getEscrowAppAddress(escrowAppId),
    appLiquidity,
    features: ["create_escrow", "accept_task", "submit_work", "approve", "reject_work", "release", "refund"],
    legacyOpenBountyAppIds: LEGACY_OPEN_BOUNTY_APP_IDS,
    legacyNoRejectAppIds: LEGACY_NO_REJECT_APP_IDS,
    timestamp: new Date().toISOString(),
  });
});

/** Dev: top up escrow app MBR seed when liquid ALGO is low. */
healthRouter.post("/fund-app", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Not available in production" });
    return;
  }
  try {
    const appId = req.body?.app_id ? Number(req.body.app_id) : getCurrentEscrowAppId();
    const before = await getEscrowAppLiquidMicroAlgos(appId);
    const txId = await ensureEscrowAppMbrSeed(appId);
    const after = await getEscrowAppLiquidMicroAlgos(appId);
    res.json({
      funded: Boolean(txId),
      txId,
      before,
      after,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});
