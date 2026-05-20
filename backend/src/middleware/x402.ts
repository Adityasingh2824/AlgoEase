/**
 * x402 payment middleware for Express.
 *
 * Routes protected by this middleware respond with HTTP 402 + payment payload
 * when no valid X-Payment header is present. When the header exists, it verifies
 * the payment with the GoPlausible facilitator before proceeding.
 */
import type { Request, Response, NextFunction } from "express";
import type { X402PaymentPayload, VerifiedPayment } from "../types/x402.js";
import { verifyPayment } from "../services/facilitator.js";

export interface X402RouteConfig {
  /** Static amount in microAlgos / base units (used when amountFromReq is absent). */
  amount?: string;
  /** Resolve payment amount from the request body (e.g. deposit size). */
  amountFromReq?: (req: Request) => string;
  asset?: string;
  assetFromReq?: (req: Request) => string;
  description: string;
  payTo: string | (() => string);
  taskIdFromReq?: (req: Request) => string | string[] | undefined;
}

function resolvePayTo(payTo: string | (() => string)): string {
  return typeof payTo === "function" ? payTo() : payTo;
}

function resolveAmount(config: X402RouteConfig, req: Request): string {
  if (config.amountFromReq) return config.amountFromReq(req);
  return config.amount ?? "0";
}

function resolveAsset(config: X402RouteConfig, req: Request): string {
  if (config.assetFromReq) return config.assetFromReq(req);
  return config.asset ?? "ALGO";
}

declare global {
  namespace Express {
    interface Request {
      x402Payment?: VerifiedPayment;
    }
  }
}

/**
 * Creates x402 enforcement middleware for a given route config.
 */
export function x402Middleware(config: X402RouteConfig) {
  const network = (process.env.X402_NETWORK ?? "algorand-testnet") as
    | "algorand-testnet"
    | "algorand-mainnet";

  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers["x-payment"] as string | undefined;
    const amount = resolveAmount(config, req);
    const asset = resolveAsset(config, req);
    const payTo = resolvePayTo(config.payTo);

    if (!paymentHeader) {
      const rawTaskId = config.taskIdFromReq?.(req) ?? (req.body?.task_id as string) ?? "";
      const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
      const payload: X402PaymentPayload = {
        version: "1.0",
        accepts: [
          {
            scheme: "exact",
            network,
            maxAmountRequired: amount,
            resource: req.originalUrl,
            description: config.description,
            mimeType: "application/json",
            payTo,
            maxTimeoutSeconds: 30,
            asset,
            extra: taskId ? { taskId } : undefined,
          },
        ],
      };
      res.status(402).json(payload);
      return;
    }

    try {
      const verified = await verifyPayment(paymentHeader, {
        expectedPayTo: payTo,
        expectedAmount: amount,
        expectedAsset: asset,
      });
      req.x402Payment = verified;
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment verification failed";
      res.status(400).json({ error: message });
    }
  };
}
