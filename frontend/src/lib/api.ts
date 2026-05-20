/**
 * API client with x402 payment handling.
 *
 * When a request returns HTTP 402, the response body contains the payment
 * challenge (X402PaymentPayload). The caller can then sign a payment
 * transaction and retry with the X-Payment header.
 */

/** In dev, use Vite proxy (same origin) unless VITE_BACKEND_URL is set explicitly. */
const BASE_URL =
  import.meta.env.VITE_BACKEND_URL ??
  (import.meta.env.DEV ? "" : "http://localhost:3001");

function networkErrorMessage(cause: unknown): string {
  const msg = cause instanceof Error ? cause.message : String(cause);
  if (
    msg === "Failed to fetch" ||
    msg === "fetch failed" ||
    msg.includes("NetworkError") ||
    msg.includes("ECONNREFUSED")
  ) {
    return "Cannot reach the API. From the project root run: npm run dev (starts backend on port 3001 and frontend on 5173).";
  }
  return msg;
}

export interface X402PaymentAccept {
  scheme: "exact";
  network: "algorand-testnet" | "algorand-mainnet";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: { taskId: string };
}

export interface X402PaymentPayload {
  version: "1.0";
  accepts: X402PaymentAccept[];
}

export class PaymentRequiredError extends Error {
  public payload: X402PaymentPayload;
  constructor(payload: X402PaymentPayload) {
    super("Payment required (HTTP 402)");
    this.name = "PaymentRequiredError";
    this.payload = payload;
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  paymentHeader?: string;
}

/**
 * Make an API request. Throws PaymentRequiredError on 402.
 */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, paymentHeader } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (paymentHeader) {
    headers["X-Payment"] = paymentHeader;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(networkErrorMessage(err));
  }

  if (res.status === 402) {
    const payload = (await res.json()) as X402PaymentPayload;
    throw new PaymentRequiredError(payload);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const body = err as { error?: string };
    throw new Error(body.error ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Retry a request with the X-Payment header after signing.
 */
export async function apiWithPayment<T = unknown>(
  path: string,
  body: unknown,
  signedTxnBase64: string,
): Promise<T> {
  return api<T>(path, { method: "POST", body, paymentHeader: signedTxnBase64 });
}
