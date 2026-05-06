import algosdk from "algosdk";

type RequiredEnv = {
  algodToken: string;
  algodServer: string;
  algodPort: string;
  appId: number;
  defaultMnemonic: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getAlgorandEnv(): RequiredEnv {
  const appIdRaw = getRequiredEnv("ALGORAND_APP_ID");
  const appId = Number(appIdRaw);
  if (!Number.isFinite(appId) || appId <= 0) {
    throw new Error("ALGORAND_APP_ID must be a positive number");
  }
  return {
    // Public providers like AlgoNode do not require an API token.
    algodToken: process.env.ALGORAND_ALGOD_TOKEN ?? "",
    algodServer: getRequiredEnv("ALGORAND_ALGOD_SERVER"),
    algodPort: process.env.ALGORAND_ALGOD_PORT ?? "",
    appId,
    defaultMnemonic: getRequiredEnv("ALGORAND_DEFAULT_MNEMONIC"),
  };
}

export function createAlgodClient() {
  const env = getAlgorandEnv();
  return new algosdk.Algodv2(env.algodToken, env.algodServer, env.algodPort);
}

export function signerFromMnemonic(mnemonic: string) {
  const account = algosdk.mnemonicToSecretKey(mnemonic.trim());
  const signer = algosdk.makeBasicAccountTransactionSigner(account);
  return { account, signer };
}

export function getEscrowMethods() {
  return {
    createEscrow: new algosdk.ABIMethod({
      name: "create_escrow",
      args: [{ type: "address" }, { type: "uint64" }, { type: "pay" }],
      returns: { type: "void" },
    }),
    submitWork: new algosdk.ABIMethod({
      name: "submit_work",
      args: [{ type: "string" }],
      returns: { type: "void" },
    }),
    approve: new algosdk.ABIMethod({
      name: "approve",
      args: [],
      returns: { type: "void" },
    }),
    releasePayment: new algosdk.ABIMethod({
      name: "release_payment",
      args: [],
      returns: { type: "void" },
    }),
    refund: new algosdk.ABIMethod({
      name: "refund",
      args: [],
      returns: { type: "void" },
    }),
  };
}
