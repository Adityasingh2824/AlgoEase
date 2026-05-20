import algosdk, { type Transaction } from "algosdk";
import { NetworkId, WalletId, WalletManager } from "@txnlab/use-wallet";

import type { WalletTxnKind, WalletType } from "./wallet-types";

const MICROALGOS_IN_ALGO = 1_000_000;

function toWalletId(walletType: WalletType): WalletId {
  return walletType === "pera" ? WalletId.PERA : WalletId.DEFLY;
}

export class AlgoEaseWalletService {
  private manager: WalletManager;

  get algodClient() {
    return this.manager.algodClient;
  }

  constructor() {
    this.manager = new WalletManager({
      wallets: [
        {
          id: WalletId.PERA,
          options: { chainId: 416002, shouldShowSignTxnToast: true },
        },
        {
          id: WalletId.DEFLY,
          options: { chainId: 416002, shouldShowSignTxnToast: true },
        },
      ],
      defaultNetwork: NetworkId.TESTNET,
      options: { resetNetwork: false },
    });
  }

  async init() {
    await this.manager.resumeSessions();
  }

  get activeAddress() {
    return this.manager.activeAddress;
  }

  get activeWalletType(): WalletType | null {
    const activeId = this.manager.activeWallet?.id;
    if (activeId === WalletId.PERA) return "pera";
    if (activeId === WalletId.DEFLY) return "defly";
    return null;
  }

  async connect(walletType: WalletType) {
    const wallet = this.manager.getWallet(toWalletId(walletType));
    if (!wallet) throw new Error(`Wallet not configured: ${walletType}`);
    await wallet.connect();
    wallet.setActive();
    return wallet.activeAddress;
  }

  async disconnect() {
    await this.manager.disconnect();
  }

  async getAlgoBalance(address: string) {
    const account = await this.manager.algodClient.accountInformation(address).do();
    return Number(account.amount ?? 0) / MICROALGOS_IN_ALGO;
  }

  async signTransaction(txn: Transaction | Transaction[]) {
    const wallet = this.manager.activeWallet;
    if (!wallet?.activeAddress) throw new Error("Connect wallet first");

    const txns = Array.isArray(txn) ? txn : [txn];
    // Do not re-assign group id when ATC (or caller) already grouped the txns.
    const needsGroup =
      txns.length > 1 &&
      !txns.every((t) => {
        const group = t.group;
        return group instanceof Uint8Array ? group.length > 0 : Boolean(group);
      });
    if (needsGroup) {
      algosdk.assignGroupID(txns);
    }

    const signed = await wallet.signTransactions(txns);
    const blobs = signed.filter((blob): blob is Uint8Array => blob instanceof Uint8Array);
    if (blobs.length !== txns.length) {
      throw new Error("Wallet did not return a signature for every transaction.");
    }
    return blobs;
  }

  async signByKind(kind: WalletTxnKind, txn: Transaction | Transaction[]) {
    if (!["x402_deposit", "approve", "refund"].includes(kind)) {
      throw new Error("Unsupported transaction type");
    }
    return this.signTransaction(txn);
  }

  async signFlowTransaction(kind: WalletTxnKind, amountAlgo: number) {
    const address = this.activeAddress;
    if (!address) throw new Error("Connect wallet first");
    const suggestedParams = await this.manager.algodClient.getTransactionParams().do();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: address,
      amount: Math.max(0, Math.round(amountAlgo * MICROALGOS_IN_ALGO)),
      note: new TextEncoder().encode(`algoease:${kind}`),
      suggestedParams,
    });
    return this.signByKind(kind, txn);
  }
}

let instance: AlgoEaseWalletService | null = null;

export function createWalletService() {
  if (!instance) instance = new AlgoEaseWalletService();
  return instance;
}
