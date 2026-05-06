import algosdk from "algosdk";
import { Router } from "express";
import { z } from "zod";
import { createAlgodClient, getAlgorandEnv, getEscrowMethods, signerFromMnemonic } from "../lib/algorand.js";

const router = Router();

const mnemonicField = z.string().min(20, "senderMnemonic is required");
const addressField = z.string().min(10);

const createSchema = z.object({
  senderMnemonic: mnemonicField.optional(),
  freelancerAddress: addressField,
  amountMicroAlgos: z.number().int().positive(),
});

const submitSchema = z.object({
  senderMnemonic: mnemonicField.optional(),
  ipfsHash: z.string().min(1),
});

const actionSchema = z.object({
  senderMnemonic: mnemonicField.optional(),
});

async function waitForConfirmation(algod: algosdk.Algodv2, txId: string) {
  const result = await algosdk.waitForConfirmation(algod, txId, 4);
  const toJsonNumber = (value: unknown): number | string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "bigint") {
      return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
    }
    if (typeof value === "number") return value;
    return Number(value);
  };

  return {
    txId,
    confirmedRound: toJsonNumber(result.confirmedRound),
    applicationIndex: toJsonNumber(result.applicationIndex),
    innerTxns: result.innerTxns?.length ?? 0,
  };
}

function logStatus(action: string, txId: string, status: string) {
  console.log(`[escrow:${action}] txId=${txId} status=${status}`);
}

function logError(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[escrow:${action}] error=${message}`);
}

function resolveRequestMnemonic(payloadMnemonic: string | undefined, envMnemonic: string) {
  if (!payloadMnemonic) return envMnemonic;
  if (process.env.NODE_ENV === "development") return payloadMnemonic;
  throw new Error("senderMnemonic override is only allowed in development");
}

function normalizeAddress(address: unknown): string {
  if (typeof address === "string") return address.trim();
  if (address && typeof address === "object" && "toString" in address) {
    const value = String(address).trim();
    if (value) return value;
  }
  throw new Error("Invalid Algorand address value");
}

function sameAlgorandPubkey(a: unknown, b: unknown): boolean {
  const da = algosdk.decodeAddress(normalizeAddress(a));
  const db = algosdk.decodeAddress(normalizeAddress(b));
  if (da.publicKey.length !== db.publicKey.length) return false;
  for (let i = 0; i < da.publicKey.length; i++) {
    if (da.publicKey[i] !== db.publicKey[i]) return false;
  }
  return true;
}

function withCoveredInnerFee(params: algosdk.SuggestedParams, innerCount = 1): algosdk.SuggestedParams {
  const minFee = typeof params.minFee === "bigint" ? Number(params.minFee) : Number(params.minFee ?? 1000);
  const totalFee = minFee * (1 + Math.max(innerCount, 1));
  return { ...params, flatFee: true, fee: totalFee };
}

router.post("/create", async (req, res) => {
  try {
    const payload = createSchema.parse(req.body);
    const env = getAlgorandEnv();
    const algod = createAlgodClient();
    const methods = getEscrowMethods();
    const { account, signer } = signerFromMnemonic(
      resolveRequestMnemonic(payload.senderMnemonic, env.defaultMnemonic),
    );

    const freelancer = payload.freelancerAddress.trim();
    if (sameAlgorandPubkey(account.addr, freelancer)) {
      throw new Error(
        "freelancerAddress must differ from the client account (ALGORAND_DEFAULT_MNEMONIC). " +
          "The contract rejects create_escrow when client and freelancer are the same address.",
      );
    }

    const params = await algod.getTransactionParams().do();
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: algosdk.getApplicationAddress(env.appId),
      amount: payload.amountMicroAlgos,
      suggestedParams: params,
    });

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: env.appId,
      method: methods.createEscrow,
      methodArgs: [freelancer, payload.amountMicroAlgos, { txn: paymentTxn, signer }],
      sender: account.addr,
      suggestedParams: params,
      signer,
    });

    const submitResult = await atc.execute(algod, 4);
    for (const txId of submitResult.txIDs) logStatus("create", txId, "submitted");

    const confirmations = await Promise.all(submitResult.txIDs.map((id) => waitForConfirmation(algod, id)));
    for (const item of confirmations) logStatus("create", item.txId, "confirmed");

    res.status(200).json({
      action: "create",
      appId: env.appId,
      txIds: submitResult.txIDs,
      confirmations,
    });
  } catch (error) {
    logError("create", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "create", error: message });
  }
});

router.post("/submit", async (req, res) => {
  try {
    const payload = submitSchema.parse(req.body);
    const env = getAlgorandEnv();
    const algod = createAlgodClient();
    const methods = getEscrowMethods();
    const { account, signer } = signerFromMnemonic(
      resolveRequestMnemonic(payload.senderMnemonic, env.defaultMnemonic),
    );
    const params = await algod.getTransactionParams().do();

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: env.appId,
      method: methods.submitWork,
      methodArgs: [payload.ipfsHash],
      sender: account.addr,
      suggestedParams: params,
      signer,
    });

    const submitResult = await atc.execute(algod, 4);
    const txId = submitResult.txIDs[0];
    logStatus("submit", txId, "submitted");
    const confirmation = await waitForConfirmation(algod, txId);
    logStatus("submit", txId, "confirmed");

    res.status(200).json({ action: "submit", appId: env.appId, txId, confirmation });
  } catch (error) {
    logError("submit", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "submit", error: message });
  }
});

router.post("/approve", async (req, res) => {
  try {
    const payload = actionSchema.parse(req.body);
    const env = getAlgorandEnv();
    const algod = createAlgodClient();
    const methods = getEscrowMethods();
    const { account, signer } = signerFromMnemonic(
      resolveRequestMnemonic(payload.senderMnemonic, env.defaultMnemonic),
    );
    const params = await algod.getTransactionParams().do();

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: env.appId,
      method: methods.approve,
      methodArgs: [],
      sender: account.addr,
      suggestedParams: params,
      signer,
    });

    const submitResult = await atc.execute(algod, 4);
    const txId = submitResult.txIDs[0];
    logStatus("approve", txId, "submitted");
    const confirmation = await waitForConfirmation(algod, txId);
    logStatus("approve", txId, "confirmed");

    res.status(200).json({ action: "approve", appId: env.appId, txId, confirmation });
  } catch (error) {
    logError("approve", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "approve", error: message });
  }
});

router.post("/release", async (req, res) => {
  try {
    const payload = actionSchema.parse(req.body);
    const env = getAlgorandEnv();
    const algod = createAlgodClient();
    const methods = getEscrowMethods();
    const { account, signer } = signerFromMnemonic(
      resolveRequestMnemonic(payload.senderMnemonic, env.defaultMnemonic),
    );
    const params = await algod.getTransactionParams().do();

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: env.appId,
      method: methods.releasePayment,
      methodArgs: [],
      sender: account.addr,
      suggestedParams: withCoveredInnerFee(params, 1),
      signer,
    });

    const submitResult = await atc.execute(algod, 4);
    const txId = submitResult.txIDs[0];
    logStatus("release", txId, "submitted");
    const confirmation = await waitForConfirmation(algod, txId);
    logStatus("release", txId, "confirmed");

    res.status(200).json({ action: "release", appId: env.appId, txId, confirmation });
  } catch (error) {
    logError("release", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "release", error: message });
  }
});

router.post("/refund", async (req, res) => {
  try {
    const payload = actionSchema.parse(req.body);
    const env = getAlgorandEnv();
    const algod = createAlgodClient();
    const methods = getEscrowMethods();
    const { account, signer } = signerFromMnemonic(
      resolveRequestMnemonic(payload.senderMnemonic, env.defaultMnemonic),
    );
    const params = await algod.getTransactionParams().do();

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: env.appId,
      method: methods.refund,
      methodArgs: [],
      sender: account.addr,
      suggestedParams: withCoveredInnerFee(params, 1),
      signer,
    });

    const submitResult = await atc.execute(algod, 4);
    const txId = submitResult.txIDs[0];
    logStatus("refund", txId, "submitted");
    const confirmation = await waitForConfirmation(algod, txId);
    logStatus("refund", txId, "confirmed");

    res.status(200).json({ action: "refund", appId: env.appId, txId, confirmation });
  } catch (error) {
    logError("refund", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(400).json({ action: "refund", error: message });
  }
});

export { router as escrowRouter };
