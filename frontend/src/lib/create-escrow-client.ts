import algosdk, { type Transaction } from "algosdk";
import type { X402PaymentAccept } from "@/lib/api";
import { CURRENT_ESCROW_APP_ID } from "@/lib/algorand-config";
import { escrowBoxNameBytes } from "@/lib/escrow-box";
import { ensureWalletService } from "@/lib/wallet/wallet-service";

const APP_ID = CURRENT_ESCROW_APP_ID;
/** Open bounty — zero address until a freelancer accepts. */
const OPEN_FREELANCER_ADDRESS =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

function getCreateMethods() {
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
  };
}

function makeWalletSigner(
  sign: (txns: Transaction | Transaction[]) => Promise<Uint8Array[]>,
): algosdk.TransactionSigner {
  return async (txnGroup, indexesToSign) => {
    const unsigned = indexesToSign.map((index) => txnGroup[index]);
    return sign(unsigned.length === 1 ? unsigned[0]! : unsigned);
  };
}

export interface CreateEscrowOnChainParams {
  accept: X402PaymentAccept;
  taskId: string;
  senderAddress: string;
  deadlineTimestamp: number;
  freelancerAddress?: string;
}

/**
 * Build and submit create_escrow / create_escrow_usdc atomic group from the connected wallet.
 * Matches the x402 challenge payTo and amount from the 402 response.
 */
export async function submitCreateEscrowFromWallet(
  params: CreateEscrowOnChainParams,
): Promise<{ txIds: string[] }> {
  const service = await ensureWalletService();
  if (!service) {
    throw new Error("Wallet service unavailable.");
  }

  await service.init();

  if (!service.activeAddress) {
    throw new Error("Connect your wallet first.");
  }
  if (service.activeAddress !== params.senderAddress) {
    throw new Error("Connected wallet does not match the funding address.");
  }

  const { accept, taskId, senderAddress, deadlineTimestamp } = params;
  const freelancer = params.freelancerAddress?.trim() || OPEN_FREELANCER_ADDRESS;
  const appAddress = algosdk.getApplicationAddress(APP_ID).toString();

  if (accept.payTo !== appAddress) {
    throw new Error("Escrow app address mismatch — check VITE_ALGORAND_APP_ID.");
  }

  const amount = Number(accept.maxAmountRequired);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid escrow amount from payment challenge.");
  }

  const isUsdc = accept.asset !== "ALGO";
  const usdcAssetId = isUsdc ? Number(accept.asset) : 0;
  if (isUsdc && (!Number.isFinite(usdcAssetId) || usdcAssetId <= 0)) {
    throw new Error("Invalid USDC asset id from payment challenge.");
  }

  const algod = service.algodClient;
  const suggestedParams = await algod.getTransactionParams().do();
  const methods = getCreateMethods();
  const walletSigner = makeWalletSigner((txns) => service.signTransaction(txns));
  const atc = new algosdk.AtomicTransactionComposer();

  if (isUsdc) {
    const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: senderAddress,
      receiver: accept.payTo,
      amount,
      assetIndex: usdcAssetId,
      suggestedParams,
    });

    atc.addMethodCall({
      appID: APP_ID,
      method: methods.createEscrowUsdc,
      methodArgs: [
        taskId,
        freelancer,
        deadlineTimestamp,
        usdcAssetId,
        { txn: assetTransferTxn, signer: walletSigner },
      ],
      sender: senderAddress,
      suggestedParams,
      signer: walletSigner,
      boxes: [{ appIndex: APP_ID, name: escrowBoxNameBytes(taskId) }],
    });
  } else {
    const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: senderAddress,
      receiver: accept.payTo,
      amount,
      suggestedParams,
    });

    atc.addMethodCall({
      appID: APP_ID,
      method: methods.createEscrow,
      methodArgs: [taskId, freelancer, deadlineTimestamp, 0, { txn: paymentTxn, signer: walletSigner }],
      sender: senderAddress,
      suggestedParams,
      signer: walletSigner,
      boxes: [{ appIndex: APP_ID, name: escrowBoxNameBytes(taskId) }],
    });
  }

  // gatherSignatures opens Pera/Defly; submit broadcasts the signed group.
  await atc.gatherSignatures();
  const txIds = await atc.submit(algod);
  if (!txIds.length) {
    throw new Error("No transaction ids returned after submit.");
  }

  await algosdk.waitForConfirmation(algod, txIds[0]!, 4);
  return { txIds };
}
