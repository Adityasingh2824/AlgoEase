import algosdk, { type Transaction } from "algosdk";
import { CURRENT_ESCROW_APP_ID, isLegacyOpenBountyApp, legacyBountyAcceptMessage } from "@/lib/algorand-config";
import { escrowBoxNameBytes } from "@/lib/escrow-box";
import { ensureWalletService } from "@/lib/wallet/wallet-service";

export type EscrowWalletMethod =
  | "acceptTask"
  | "submitWork"
  | "approve"
  | "releasePayment"
  | "refund"
  | "rejectWork";

const INNER_FEE_METHODS = new Set<EscrowWalletMethod>(["releasePayment", "refund", "rejectWork"]);

function getEscrowMethods() {
  return {
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
  };
}

function withBoxWriteFee(params: algosdk.SuggestedParams): algosdk.SuggestedParams {
  const minFee = typeof params.minFee === "bigint" ? Number(params.minFee) : Number(params.minFee ?? 1000);
  return { ...params, flatFee: true, fee: minFee * 2 };
}

function withInnerFee(params: algosdk.SuggestedParams): algosdk.SuggestedParams {
  const minFee = typeof params.minFee === "bigint" ? Number(params.minFee) : Number(params.minFee ?? 1000);
  return { ...params, flatFee: true, fee: minFee * 2 };
}

function suggestedParamsForMethod(
  params: algosdk.SuggestedParams,
  method: EscrowWalletMethod,
): algosdk.SuggestedParams {
  if (INNER_FEE_METHODS.has(method)) return withInnerFee(params);
  return withBoxWriteFee(params);
}

function makeWalletSigner(
  sign: (txns: Transaction | Transaction[]) => Promise<Uint8Array[]>,
): algosdk.TransactionSigner {
  return async (txnGroup, indexesToSign) => {
    const unsigned = indexesToSign.map((index) => txnGroup[index]!);
    return sign(unsigned.length === 1 ? unsigned[0]! : unsigned);
  };
}

function formatAlgorandError(err: unknown, appId: number): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("freelancer must differ from client")) {
      return "You cannot accept a bounty you created. Connect a different wallet as the freelancer.";
    }
    if (msg.includes("not OPEN")) {
      return "This bounty is no longer open for acceptance.";
    }
    if (msg.includes("not ACCEPTED")) {
      return "Work can only be submitted after accepting the bounty.";
    }
    if (msg.includes("not SUBMITTED")) {
      return "This action requires submitted work from the freelancer.";
    }
    if (msg.includes("not APPROVED")) {
      return "Payment can only be released after the client approves work.";
    }
    if (msg.includes("only client")) {
      return "Only the bounty client can perform this action.";
    }
    if (msg.includes("only freelancer")) {
      return "Only the assigned freelancer can perform this action.";
    }
    if (msg.includes("User Rejected Request") || msg.includes("rejected")) {
      return "Transaction was rejected in your wallet.";
    }
    if (msg.includes("box_extract") || msg.includes("pc=562")) {
      return legacyBountyAcceptMessage(appId);
    }
    if (msg.includes("unavailable Account")) {
      return (
        "The payout recipient must be included in the transaction accounts list. " +
        "Please refresh the page and try again."
      );
    }
    if (
      msg.includes("balance 0 below min") ||
      msg.includes("insufficient escrow liquidity") ||
      (msg.includes("below min") && msg.includes("balance"))
    ) {
      return (
        "The escrow app account does not have enough liquid ALGO to complete this payout " +
        "(box storage locks part of the deposit as minimum balance). " +
        "Try again after the deployer funds the app with ~0.1 ALGO, or create new bounties on the latest app."
      );
    }
    return msg;
  }
  return String(err);
}

export type EscrowCallOptions = {
  /** Extra accounts the contract touches in inner transactions (e.g. freelancer on release). */
  accounts?: string[];
  foreignAssets?: number[];
};

/**
 * Sign and submit an escrow app call with the connected wallet.
 */
export async function executeWalletEscrowCall(
  senderAddress: string,
  taskId: string,
  method: EscrowWalletMethod,
  extraArgs: unknown[] = [],
  appId: number = CURRENT_ESCROW_APP_ID,
  options: EscrowCallOptions = {},
): Promise<{ txId: string }> {
  if (method === "acceptTask" && isLegacyOpenBountyApp(appId)) {
    throw new Error(legacyBountyAcceptMessage(appId));
  }

  const service = await ensureWalletService();
  if (!service) {
    throw new Error("Wallet service unavailable.");
  }
  await service.init();
  if (!service.activeAddress) {
    throw new Error("Connect your wallet first.");
  }
  if (service.activeAddress !== senderAddress) {
    throw new Error("Connected wallet does not match the acting address.");
  }

  const algod = service.algodClient;
  const methods = getEscrowMethods();
  const baseParams = await algod.getTransactionParams().do();
  const suggestedParams = suggestedParamsForMethod(baseParams, method);
  const abiMethod = methods[method];

  const atc = new algosdk.AtomicTransactionComposer();
  atc.addMethodCall({
    appID: appId,
    method: abiMethod,
    methodArgs: [taskId, ...extraArgs] as algosdk.ABIArgument[],
    sender: senderAddress,
    suggestedParams,
    signer: makeWalletSigner((txns) => service.signTransaction(txns)),
    boxes: [{ appIndex: appId, name: escrowBoxNameBytes(taskId) }],
    appAccounts: options.accounts,
    appForeignAssets: options.foreignAssets,
  });

  try {
    await atc.gatherSignatures();
    const txIds = await atc.submit(algod);
    const txId = txIds[0];
    if (!txId) throw new Error("No transaction id returned");
    await algosdk.waitForConfirmation(algod, txId, 4);
    return { txId };
  } catch (err) {
    throw new Error(formatAlgorandError(err, appId));
  }
}
