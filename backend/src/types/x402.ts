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

export interface VerifiedPayment {
  txId: string;
  sender: string;
  amount: string;
  asset: string;
  taskId?: string;
  /** Base64 signed payment txn when verified locally without broadcasting. */
  signedTxnBase64?: string;
}
