/**
 * x402 payment verification — local Algorand verify + submit, with optional GoPlausible facilitator.
 */
import algosdk from "algosdk";
import type { VerifiedPayment } from "../types/x402.js";

const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ?? "https://facilitator.goplausible.xyz";

export interface VerifyOptions {
  expectedPayTo: string;
  expectedAmount: string;
  /** `ALGO` or ASA id string */
  expectedAsset: string;
}

function decodePaymentHeader(paymentHeader: string): Uint8Array {
  const trimmed = paymentHeader.trim();
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as { signedTransaction?: string; payment?: string };
    const raw = parsed.signedTransaction ?? parsed.payment;
    if (!raw) throw new Error("X-Payment JSON missing signedTransaction");
    return Uint8Array.from(Buffer.from(raw, "base64"));
  }
  return Uint8Array.from(Buffer.from(trimmed, "base64"));
}

function txnAmount(txn: algosdk.Transaction): bigint {
  if (txn.type === "pay" && txn.payment) return BigInt(txn.payment.amount);
  if (txn.type === "axfer" && txn.assetTransfer) return BigInt(txn.assetTransfer.amount);
  throw new Error(`Unsupported transaction type: ${txn.type}`);
}

function txnReceiver(txn: algosdk.Transaction): string {
  if (txn.type === "pay" && txn.payment?.receiver) {
    return txn.payment.receiver.toString();
  }
  if (txn.type === "axfer" && txn.assetTransfer?.receiver) {
    return txn.assetTransfer.receiver.toString();
  }
  throw new Error(`Unsupported transaction type: ${txn.type}`);
}

function txnAssetId(txn: algosdk.Transaction): number {
  if (txn.type === "pay") return 0;
  if (txn.type === "axfer" && txn.assetTransfer) return Number(txn.assetTransfer.assetIndex);
  throw new Error(`Unsupported transaction type: ${txn.type}`);
}

function txnSender(txn: algosdk.Transaction): string {
  return txn.sender.toString();
}

/**
 * Verify payment by decoding the signed txn and checking payee/amount/asset (no broadcast).
 */
async function verifyPaymentLocally(
  paymentHeader: string,
  options: VerifyOptions,
): Promise<VerifiedPayment> {
  const signedBytes = decodePaymentHeader(paymentHeader);
  const signed = algosdk.decodeSignedTransaction(signedBytes);
  const txn = signed.txn;

  const expectedAmount = BigInt(options.expectedAmount);
  const amount = txnAmount(txn);
  const receiver = txnReceiver(txn);
  const sender = txnSender(txn);
  const assetId = txnAssetId(txn);

  if (receiver !== options.expectedPayTo) {
    throw new Error(`Payment receiver mismatch: expected ${options.expectedPayTo}, got ${receiver}`);
  }
  if (amount < expectedAmount) {
    throw new Error(`Payment amount too low: expected ${expectedAmount}, got ${amount}`);
  }

  const expectedAssetId =
    options.expectedAsset === "ALGO" ? 0 : Number(options.expectedAsset);
  if (!Number.isFinite(expectedAssetId)) {
    throw new Error(`Invalid expected asset: ${options.expectedAsset}`);
  }
  if (assetId !== expectedAssetId) {
    throw new Error(
      `Payment asset mismatch: expected ${options.expectedAsset}, got asset ${assetId}`,
    );
  }

  const header = paymentHeader.trim();

  return {
    txId: txn.txID(),
    sender,
    amount: amount.toString(),
    asset: options.expectedAsset,
    signedTxnBase64: header.startsWith("{") ? undefined : header,
  };
}

/**
 * Verify a payment proof with the GoPlausible facilitator (v2 API) or local fallback.
 */
export async function verifyPayment(
  paymentHeader: string,
  options: VerifyOptions,
): Promise<VerifiedPayment> {
  const useLocal =
    process.env.X402_VERIFY_MODE === "local" ||
    process.env.NODE_ENV === "development";

  if (useLocal) {
    return verifyPaymentLocally(paymentHeader, options);
  }

  try {
    const response = await fetch(`${FACILITATOR_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: { payment: paymentHeader },
        paymentRequirements: {
          scheme: "exact",
          network: process.env.X402_NETWORK ?? "algorand-testnet",
          maxAmountRequired: options.expectedAmount,
          payTo: options.expectedPayTo,
          asset: options.expectedAsset,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Facilitator rejected payment: ${response.status} ${body}`);
    }

    const result = (await response.json()) as {
      txId?: string;
      txid?: string;
      sender?: string;
      amount?: string;
      asset?: string;
      memo?: string;
    };

    return {
      txId: result.txId ?? result.txid ?? "",
      sender: result.sender ?? "",
      amount: result.amount ?? options.expectedAmount,
      asset: result.asset ?? options.expectedAsset,
      taskId: result.memo,
    };
  } catch (err) {
    console.warn("[x402] Facilitator verify failed, falling back to local:", err);
    return verifyPaymentLocally(paymentHeader, options);
  }
}

export async function settlePayment(txId: string): Promise<void> {
  if (process.env.X402_VERIFY_MODE === "local" || process.env.NODE_ENV === "development") {
    return;
  }
  const response = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txId }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Facilitator settlement failed: ${response.status} ${body}`);
  }
}
