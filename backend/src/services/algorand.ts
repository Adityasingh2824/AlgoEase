/**
 * Algorand service — algosdk client, ABI methods, atomic transaction builder.
 */
import algosdk from "algosdk";
import { escrowBoxNameBytes } from "../lib/escrow-box.js";
import { getCurrentEscrowAppId, getEscrowAppAddress } from "../lib/algorand-config.js";

// ─── Environment ─────────────────────────────────────────────────────────────

export function getAlgorandEnv() {
  const appId = getCurrentEscrowAppId();
  return {
    algodToken: process.env.ALGORAND_ALGOD_TOKEN ?? "",
    algodServer:
      process.env.ALGORAND_ALGOD_SERVER ??
      process.env.ALGOD_SERVER ??
      "https://testnet-api.algonode.cloud",
    algodPort: process.env.ALGORAND_ALGOD_PORT ?? "",
    indexerServer: process.env.INDEXER_SERVER ?? "https://testnet-idx.algonode.cloud",
    appId,
    defaultMnemonic:
      process.env.ALGORAND_DEFAULT_MNEMONIC ??
      process.env.DEPLOYER_MNEMONIC ??
      "",
    usdcAssetId: Number(process.env.USDC_ASSET_ID ?? "10458941"),
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

export function getAppAddress(): string {
  return getEscrowAppAddress();
}

// ─── ABI Methods (matches new BoxMap contract) ───────────────────────────────

export function getEscrowMethods() {
  return {
    createEscrow: new algosdk.ABIMethod({
      name: "create_escrow",
      args: [
        { type: "string", name: "task_id" },
        { type: "address", name: "freelancer" },
        { type: "uint64", name: "deadline" },
        { type: "uint64", name: "usdc_asset_id" },
        { type: "pay", name: "fund" },
      ],
      returns: { type: "void" },
    }),
    createEscrowUsdc: new algosdk.ABIMethod({
      name: "create_escrow_usdc",
      args: [
        { type: "string", name: "task_id" },
        { type: "address", name: "freelancer" },
        { type: "uint64", name: "deadline" },
        { type: "uint64", name: "usdc_asset_id" },
        { type: "axfer", name: "fund" },
      ],
      returns: { type: "void" },
    }),
    acceptTask: new algosdk.ABIMethod({
      name: "accept_task",
      args: [{ type: "string", name: "task_id" }],
      returns: { type: "void" },
    }),
    submitWork: new algosdk.ABIMethod({
      name: "submit_work",
      args: [
        { type: "string", name: "task_id" },
        { type: "string", name: "ipfs_cid" },
      ],
      returns: { type: "void" },
    }),
    approve: new algosdk.ABIMethod({
      name: "approve",
      args: [{ type: "string", name: "task_id" }],
      returns: { type: "void" },
    }),
    releasePayment: new algosdk.ABIMethod({
      name: "release_payment",
      args: [{ type: "string", name: "task_id" }],
      returns: { type: "void" },
    }),
    refund: new algosdk.ABIMethod({
      name: "refund",
      args: [{ type: "string", name: "task_id" }],
      returns: { type: "void" },
    }),
    rejectWork: new algosdk.ABIMethod({
      name: "reject_work",
      args: [{ type: "string", name: "task_id" }],
      returns: { type: "void" },
    }),
    getStatus: new algosdk.ABIMethod({
      name: "get_status",
      args: [{ type: "string", name: "task_id" }],
      returns: { type: "uint64" },
    }),
  };
}

// ─── Atomic Transaction Helpers ──────────────────────────────────────────────

function withCoveredInnerFee(params: algosdk.SuggestedParams, innerCount = 1): algosdk.SuggestedParams {
  const minFee = typeof params.minFee === "bigint" ? Number(params.minFee) : Number(params.minFee ?? 1000);
  const totalFee = minFee * (1 + Math.max(innerCount, 1));
  return { ...params, flatFee: true, fee: totalFee };
}

export interface CreateEscrowParams {
  senderAddress: string;
  signer: algosdk.TransactionSigner;
  taskId: string;
  freelancerAddress: string;
  /** Amount in base units (microAlgos for ALGO, base units for ASA). */
  amountMicroAlgos: number;
  deadlineTimestamp: number;
  /** `ALGO` or ASA id string (e.g. testnet USDC). */
  asset?: string;
}

function resolveUsdcAssetId(asset: string | undefined, env: ReturnType<typeof getAlgorandEnv>): number | null {
  if (!asset || asset === "ALGO") return null;
  const id = Number(asset);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

/**
 * Build and execute create_escrow / create_escrow_usdc atomic group (fund + ABI call).
 */
export async function executeCreateEscrow(params: CreateEscrowParams) {
  const algod = createAlgodClient();
  const env = getAlgorandEnv();
  const methods = getEscrowMethods();
  const suggestedParams = await algod.getTransactionParams().do();
  const appAddress = getAppAddress();

  const usdcAssetId = resolveUsdcAssetId(params.asset, env);
  const useUsdc = usdcAssetId !== null;
  const atc = new algosdk.AtomicTransactionComposer();

  if (useUsdc && usdcAssetId !== null) {
    const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: params.senderAddress,
      receiver: appAddress,
      amount: params.amountMicroAlgos,
      assetIndex: usdcAssetId,
      suggestedParams,
    });

    atc.addMethodCall({
      appID: env.appId,
      method: methods.createEscrowUsdc,
      methodArgs: [
        params.taskId,
        params.freelancerAddress,
        params.deadlineTimestamp,
        usdcAssetId,
        { txn: assetTransferTxn, signer: params.signer },
      ],
      sender: params.senderAddress,
      suggestedParams,
      signer: params.signer,
      boxes: [{ appIndex: env.appId, name: escrowBoxNameBytes(params.taskId) }],
    });
  } else {
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: params.senderAddress,
      receiver: appAddress,
      amount: params.amountMicroAlgos,
      suggestedParams,
    });

    atc.addMethodCall({
      appID: env.appId,
      method: methods.createEscrow,
      methodArgs: [
        params.taskId,
        params.freelancerAddress,
        params.deadlineTimestamp,
        0,
        { txn: paymentTxn, signer: params.signer },
      ],
      sender: params.senderAddress,
      suggestedParams,
      signer: params.signer,
      boxes: [{ appIndex: env.appId, name: escrowBoxNameBytes(params.taskId) }],
    });
  }

  const result = await atc.execute(algod, 4);
  return { txIds: result.txIDs };
}

export interface SimpleCallParams {
  senderAddress: string;
  signer: algosdk.TransactionSigner;
  taskId: string;
  method: "acceptTask" | "submitWork" | "approve" | "releasePayment" | "refund" | "rejectWork";
  extraArgs?: unknown[];
  /** Defaults to ALGORAND_APP_ID from env. Set from bounty.app_id for per-bounty escrows. */
  appId?: number;
  /** Accounts referenced by inner transactions (e.g. freelancer on release). */
  accounts?: string[];
  foreignAssets?: number[];
}

/**
 * Execute a single ABI method call on the escrow app.
 */
export async function executeEscrowCall(params: SimpleCallParams) {
  const algod = createAlgodClient();
  const appId = params.appId ?? getAlgorandEnv().appId;
  const methods = getEscrowMethods();
  const method = methods[params.method];
  const suggestedParams = await algod.getTransactionParams().do();

  const needsInnerFee =
    params.method === "releasePayment" || params.method === "refund" || params.method === "rejectWork";
  const finalParams = needsInnerFee ? withCoveredInnerFee(suggestedParams, 1) : suggestedParams;

  const methodArgs: algosdk.ABIArgument[] = [params.taskId, ...(params.extraArgs ?? [])] as algosdk.ABIArgument[];

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    appID: appId,
    method,
    methodArgs,
    sender: params.senderAddress,
    suggestedParams: finalParams,
    signer: params.signer,
    boxes: [{ appIndex: appId, name: escrowBoxNameBytes(params.taskId) }],
    appAccounts: params.accounts,
    appForeignAssets: params.foreignAssets,
  });

  const result = await atc.execute(algod, 4);
  return { txId: result.txIDs[0] };
}

/** Liquid ALGO in the escrow app (balance minus min balance). */
export async function getEscrowAppLiquidMicroAlgos(appId?: number): Promise<{
  appId: number;
  appAddress: string;
  balance: number;
  minBalance: number;
  liquid: number;
}> {
  const id = appId ?? getAlgorandEnv().appId;
  const algod = createAlgodClient();
  const appAddress = algosdk.getApplicationAddress(id);
  const account = await algod.accountInformation(appAddress).do();
  const balance = Number(account.amount);
  const minBalance = Number(account["min-balance"] ?? account.minBalance ?? 0);
  return { appId: id, appAddress, balance, minBalance, liquid: balance - minBalance };
}

/**
 * Top up the escrow app when liquid ALGO is low (box MBR locks part of deposits).
 * Uses DEPLOYER_MNEMONIC / ALGORAND_DEFAULT_MNEMONIC. No-op when already funded.
 */
export async function ensureEscrowAppMbrSeed(appId?: number): Promise<string | null> {
  const env = getAlgorandEnv();
  const mnemonic = env.defaultMnemonic?.trim();
  if (!mnemonic) return null;

  const id = appId ?? env.appId;
  const targetLiquid = Number(process.env.APP_MBR_LIQUID_TARGET_MICROALGOS ?? "500000");
  const { liquid, appAddress } = await getEscrowAppLiquidMicroAlgos(id);
  if (liquid >= targetLiquid) return null;

  const topUp = Math.max(
    Number(process.env.APP_MBR_SEED_MICROALGOS ?? "500000"),
    targetLiquid - liquid + 50_000,
  );

  const deployer = algosdk.mnemonicToSecretKey(mnemonic);
  const algod = createAlgodClient();
  const params = await algod.getTransactionParams().do();
  const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: deployer.addr,
    receiver: appAddress,
    amount: topUp,
    suggestedParams: params,
    note: new Uint8Array(Buffer.from("algoease:app-mbr-seed")),
  });
  const signed = fundTxn.signTxn(deployer.sk);
  const txId = fundTxn.txID();
  await algod.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(algod, txId, 8);
  return txId;
}
