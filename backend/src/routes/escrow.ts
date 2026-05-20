/**
 * Escrow routes — task-scoped, x402-gated where money moves.
 */
import { Router } from "express";
import { z } from "zod";
import { x402Middleware } from "../middleware/x402.js";
import {
  ensureEscrowAppMbrSeed,
  executeCreateEscrow,
  executeEscrowCall,
  getAlgorandEnv,
  getAppAddress,
  signerFromMnemonic,
} from "../services/algorand.js";
import { getDb } from "../db/index.js";
import { OPEN_FREELANCER_ADDRESS } from "../lib/constants.js";
import { sameAlgorandAddress } from "../lib/algorand-address.js";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getDevSigner() {
  const env = getAlgorandEnv();
  if (process.env.NODE_ENV !== "development" || !env.defaultMnemonic) {
    throw new Error("Wallet signing required in production");
  }
  return signerFromMnemonic(env.defaultMnemonic);
}

/** ALGO amount string (e.g. "5") → microAlgos string for x402 / on-chain. */
function amountToMicroAlgos(amount: unknown): string {
  const algo = Number(amount);
  if (!Number.isFinite(algo) || algo <= 0) {
    throw new Error("amount must be a positive number");
  }
  return String(Math.round(algo * 1_000_000));
}

/**
 * Freelancer app calls signed by the connected wallet (via signed txn from client)
 * or, in development only, by the deployer when addresses match.
 */
async function executeFreelancerAction(
  taskId: string,
  claimedFreelancerAddress: string,
  method: "acceptTask" | "submitWork",
  extraArgs: unknown[] = [],
) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Wallet-signed app calls are required in production");
  }

  const { account, signer } = getDevSigner();
  const sender = account.addr.toString();

  if (claimedFreelancerAddress !== sender) {
    throw new Error(
      `In development, ${method} must be signed by your connected wallet (${claimedFreelancerAddress}). ` +
        `The API dev signer is ${sender}. Use wallet signing from the bounty page, or connect the deployer account.`,
    );
  }

  return executeEscrowCall({
    senderAddress: sender,
    signer,
    taskId,
    method,
    extraArgs,
  });
}

/**
 * Client app calls signed by the connected wallet (via tx_id from client)
 * or, in development only, by the deployer when addresses match.
 */
async function executeClientAction(
  taskId: string,
  claimedClientAddress: string,
  method: "approve" | "releasePayment" | "refund" | "rejectWork",
  options?: { accounts?: string[] },
) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Wallet-signed app calls are required in production");
  }

  const { account, signer } = getDevSigner();
  const sender = account.addr.toString();

  if (claimedClientAddress !== sender) {
    throw new Error(
      `In development, ${method} must be signed by your connected wallet (${claimedClientAddress}). ` +
        `The API dev signer is ${sender}. Use wallet signing from the bounty page, or connect the client account.`,
    );
  }

  return executeEscrowCall({
    senderAddress: sender,
    signer,
    taskId,
    method,
    accounts: options?.accounts,
  });
}

async function assertBountyClient(taskId: string, address: string) {
  const { data, error } = await getDb().from("bounties").select("*").eq("task_id", taskId).single();
  if (error || !data) {
    throw new Error("Bounty not found");
  }
  if (!sameAlgorandAddress(data.client_address, address)) {
    throw new Error("Only the bounty client can perform this action.");
  }
  return data;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const addressField = z.string().min(50).max(58);

const createSchema = z.object({
  task_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  freelancer_address: addressField.optional(),
  deadline_hours: z.number().positive(),
  amount: z.string().min(1),
  asset: z.string().default("ALGO"),
});

const submitSchema = z.object({
  ipfs_cid: z.string().min(1),
  freelancer_address: addressField,
  tx_id: z.string().min(10).optional(),
});

const walletAuthSchema = z.object({
  address: addressField,
  /** When set, only sync DB (txn already submitted from the user's wallet). */
  tx_id: z.string().min(10).optional(),
});

// ─── POST /escrow/sync-create — persist after wallet-submitted on-chain create ─

const syncCreateSchema = createSchema.extend({
  tx_ids: z.array(z.string().min(10)).min(1),
  client_address: addressField,
});

router.post("/sync-create", async (req, res) => {
  try {
    const payload = syncCreateSchema.parse(req.body);
    const deadlineTs = Math.floor(Date.now() / 1000) + payload.deadline_hours * 3600;
    const onChainFreelancer = payload.freelancer_address?.trim() || OPEN_FREELANCER_ADDRESS;

    const { error: bountyErr } = await getDb().from("bounties").insert({
      task_id: payload.task_id,
      title: payload.title,
      description: payload.description,
      client_address: payload.client_address,
      freelancer_address:
        onChainFreelancer === OPEN_FREELANCER_ADDRESS ? null : onChainFreelancer,
      amount: payload.amount,
      asset: payload.asset,
      status: "OPEN",
      app_id: String(getAlgorandEnv().appId),
      deposit_tx_id: payload.tx_ids[0],
      deadline_at: new Date(deadlineTs * 1000).toISOString(),
    });
    if (bountyErr) {
      throw new Error(bountyErr.message);
    }

    const { error: eventErr } = await getDb().from("escrow_events").insert({
      task_id: payload.task_id,
      event_type: "DEPOSIT",
      tx_id: payload.tx_ids[0],
      actor: payload.client_address,
      metadata: { amount: payload.amount, asset: payload.asset, txIds: payload.tx_ids },
    });
    if (eventErr) {
      throw new Error(eventErr.message);
    }

    try {
      await ensureEscrowAppMbrSeed();
    } catch (seedErr) {
      console.warn("[escrow:sync-create] App MBR seed failed:", seedErr);
    }

    res.json({ action: "create", txIds: payload.tx_ids, taskId: payload.task_id, dbSynced: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "create", error: message });
  }
});

// ─── POST /escrow/create — x402 gated (legacy dev path via deployer signer) ───

router.post(
  "/create",
  x402Middleware({
    amountFromReq: (req) => amountToMicroAlgos(req.body?.amount),
    assetFromReq: (req) => {
      const asset = req.body?.asset ?? "ALGO";
      return asset === "ALGO" ? "ALGO" : String(asset);
    },
    description: "Escrow deposit",
    payTo: () => getAppAddress(),
    taskIdFromReq: (req) => req.body?.task_id ?? "",
  }),
  async (req, res) => {
    try {
      const payload = createSchema.parse(req.body);
      const amountMicroAlgos = Math.round(Number(payload.amount) * 1_000_000);
      const deadlineTs = Math.floor(Date.now() / 1000) + payload.deadline_hours * 3600;

      const { account, signer } = getDevSigner();
      const clientAddress = account.addr.toString();
      const onChainFreelancer = payload.freelancer_address?.trim() || OPEN_FREELANCER_ADDRESS;

      if (onChainFreelancer !== OPEN_FREELANCER_ADDRESS && onChainFreelancer === clientAddress) {
        throw new Error("Client and freelancer must use different addresses.");
      }

      const result = await executeCreateEscrow({
        senderAddress: clientAddress,
        signer,
        taskId: payload.task_id,
        freelancerAddress: onChainFreelancer,
        amountMicroAlgos,
        deadlineTimestamp: deadlineTs,
        asset: payload.asset,
      });

      // Persist to Supabase (non-fatal — on-chain escrow already created)
      try {
        await getDb().from("bounties").insert({
          task_id: payload.task_id,
          title: payload.title,
          description: payload.description,
          client_address: clientAddress,
          freelancer_address:
            onChainFreelancer === OPEN_FREELANCER_ADDRESS ? null : onChainFreelancer,
          amount: payload.amount,
          asset: payload.asset,
          status: "OPEN",
          app_id: String(getAlgorandEnv().appId),
          deposit_tx_id: result.txIds[0],
          deadline_at: new Date(deadlineTs * 1000).toISOString(),
        });

        await getDb().from("escrow_events").insert({
          task_id: payload.task_id,
          event_type: "DEPOSIT",
          tx_id: result.txIds[0],
          actor: account.addr.toString(),
          metadata: { amount: payload.amount, asset: payload.asset },
        });
      } catch (dbErr) {
        console.warn("[escrow:create] Supabase sync failed:", dbErr);
      }

      try {
        await ensureEscrowAppMbrSeed();
      } catch (seedErr) {
        console.warn("[escrow:create] App MBR seed failed:", seedErr);
      }

      res.json({ action: "create", txIds: result.txIds, taskId: payload.task_id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ action: "create", error: message });
    }
  },
);

// ─── GET /escrow/:task_id — public read ──────────────────────────────────────

router.get("/:task_id", async (req, res) => {
  try {
    const task_id = paramStr(req.params.task_id);
    const { data, error } = await getDb()
      .from("bounties")
      .select("*")
      .eq("task_id", task_id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Bounty not found" });
      return;
    }

    const { data: events } = await getDb()
      .from("escrow_events")
      .select("*")
      .eq("task_id", task_id)
      .order("created_at", { ascending: true });

    res.json({ bounty: data, events: events ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// ─── POST /escrow/:task_id/accept — no payment ──────────────────────────────

router.post("/:task_id/accept", async (req, res) => {
  try {
    const task_id = paramStr(req.params.task_id);
    const payload = walletAuthSchema.parse(req.body);

    const txId = payload.tx_id
      ? payload.tx_id
      : (await executeFreelancerAction(task_id, payload.address, "acceptTask")).txId;

    const { error: updateErr } = await getDb()
      .from("bounties")
      .update({ status: "ACCEPTED", freelancer_address: payload.address })
      .eq("task_id", task_id);
    if (updateErr) throw new Error(updateErr.message);

    const { error: eventErr } = await getDb().from("escrow_events").insert({
      task_id,
      event_type: "ACCEPTED",
      tx_id: txId,
      actor: payload.address,
    });
    if (eventErr) throw new Error(eventErr.message);

    res.json({ action: "accept", txId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "accept", error: message });
  }
});

// ─── POST /escrow/:task_id/submit — no payment ──────────────────────────────

router.post("/:task_id/submit", async (req, res) => {
  try {
    const task_id = paramStr(req.params.task_id);
    const payload = submitSchema.parse(req.body);

    const txId = payload.tx_id
      ? payload.tx_id
      : (
          await executeFreelancerAction(
            task_id,
            payload.freelancer_address,
            "submitWork",
            [payload.ipfs_cid],
          )
        ).txId;

    const { error: updateErr } = await getDb()
      .from("bounties")
      .update({ status: "SUBMITTED", ipfs_cid: payload.ipfs_cid })
      .eq("task_id", task_id);
    if (updateErr) throw new Error(updateErr.message);

    const { error: eventErr } = await getDb().from("escrow_events").insert({
      task_id,
      event_type: "SUBMITTED",
      tx_id: txId,
      actor: payload.freelancer_address,
      metadata: { ipfs_cid: payload.ipfs_cid },
    });
    if (eventErr) throw new Error(eventErr.message);

    res.json({ action: "submit", txId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "submit", error: message });
  }
});

// ─── POST /escrow/:task_id/approve — wallet-signed (client only) ────────────

router.post("/:task_id/approve", async (req, res) => {
  try {
    const task_id = paramStr(req.params.task_id);
    const payload = walletAuthSchema.parse(req.body);
    await assertBountyClient(task_id, payload.address);

    const txId = payload.tx_id
      ? payload.tx_id
      : (await executeClientAction(task_id, payload.address, "approve")).txId;

    const { error: updateErr } = await getDb()
      .from("bounties")
      .update({ status: "APPROVED" })
      .eq("task_id", task_id);
    if (updateErr) throw new Error(updateErr.message);

    const { error: eventErr } = await getDb().from("escrow_events").insert({
      task_id,
      event_type: "APPROVED",
      tx_id: txId,
      actor: payload.address,
    });
    if (eventErr) throw new Error(eventErr.message);

    res.json({ action: "approve", txId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "approve", error: message });
  }
});

// ─── POST /escrow/:task_id/release — wallet-signed (client only) ────────────

router.post("/:task_id/release", async (req, res) => {
  try {
    const task_id = paramStr(req.params.task_id);
    const payload = walletAuthSchema.parse(req.body);
    const bounty = await assertBountyClient(task_id, payload.address);
    const freelancer = bounty.freelancer_address?.trim();
    if (!freelancer) {
      throw new Error("No freelancer is assigned to this bounty.");
    }

    const txId = payload.tx_id
      ? payload.tx_id
      : (
          await executeClientAction(task_id, payload.address, "releasePayment", {
            accounts: [freelancer],
          })
        ).txId;

    const { error: updateErr } = await getDb()
      .from("bounties")
      .update({ status: "RELEASED", release_tx_id: txId })
      .eq("task_id", task_id);
    if (updateErr) throw new Error(updateErr.message);

    const { error: eventErr } = await getDb().from("escrow_events").insert({
      task_id,
      event_type: "RELEASED",
      tx_id: txId,
      actor: payload.address,
    });
    if (eventErr) throw new Error(eventErr.message);

    res.json({ action: "release", txId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "release", error: message });
  }
});

// ─── POST /escrow/:task_id/reject — wallet-signed (client rejects submission) ─

router.post("/:task_id/reject", async (req, res) => {
  try {
    const task_id = paramStr(req.params.task_id);
    const payload = walletAuthSchema.parse(req.body);
    const bounty = await assertBountyClient(task_id, payload.address);

    if (bounty.status !== "SUBMITTED") {
      throw new Error("Work can only be rejected after it has been submitted.");
    }

    const txId = payload.tx_id
      ? payload.tx_id
      : (await executeClientAction(task_id, payload.address, "rejectWork")).txId;

    const { error: updateErr } = await getDb()
      .from("bounties")
      .update({ status: "REJECTED", refund_tx_id: txId })
      .eq("task_id", task_id);
    if (updateErr) throw new Error(updateErr.message);

    const { error: eventErr } = await getDb().from("escrow_events").insert({
      task_id,
      event_type: "REJECTED",
      tx_id: txId,
      actor: payload.address,
    });
    if (eventErr) throw new Error(eventErr.message);

    res.json({ action: "reject", txId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "reject", error: message });
  }
});

// ─── POST /escrow/:task_id/refund — wallet-signed (client only) ─────────────

router.post("/:task_id/refund", async (req, res) => {
  try {
    const task_id = paramStr(req.params.task_id);
    const payload = walletAuthSchema.parse(req.body);
    await assertBountyClient(task_id, payload.address);

    const txId = payload.tx_id
      ? payload.tx_id
      : (await executeClientAction(task_id, payload.address, "refund")).txId;

    const { error: updateErr } = await getDb()
      .from("bounties")
      .update({ status: "REFUNDED", refund_tx_id: txId })
      .eq("task_id", task_id);
    if (updateErr) throw new Error(updateErr.message);

    const { error: eventErr } = await getDb().from("escrow_events").insert({
      task_id,
      event_type: "REFUNDED",
      tx_id: txId,
      actor: payload.address,
    });
    if (eventErr) throw new Error(eventErr.message);

    res.json({ action: "refund", txId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "refund", error: message });
  }
});

export { router as escrowRouter };
