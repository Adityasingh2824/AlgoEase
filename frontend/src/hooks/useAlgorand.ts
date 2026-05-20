/**
 * useAlgorand — utility hook for Algorand explorer links and network info.
 */

import { CURRENT_ESCROW_APP_ID, getEscrowAppAddress } from "@/lib/algorand-config";

const NETWORK = import.meta.env.VITE_ALGORAND_NETWORK ?? "testnet";
const USDC_ASSET_ID = import.meta.env.VITE_USDC_ASSET_ID ?? "10458941";

function explorerBaseUrl() {
  return NETWORK === "mainnet"
    ? "https://explorer.perawallet.app"
    : "https://testnet.explorer.perawallet.app";
}

export function useAlgorand() {
  const txnUrl = (txId: string) => `${explorerBaseUrl()}/tx/${txId}`;
  const addressUrl = (addr: string) => `${explorerBaseUrl()}/address/${addr}`;
  const appUrl = (appId: string | number) => `${explorerBaseUrl()}/application/${appId}`;

  return {
    network: NETWORK,
    escrowAppId: CURRENT_ESCROW_APP_ID,
    escrowAppAddress: getEscrowAppAddress(),
    usdcAssetId: USDC_ASSET_ID,
    txnUrl,
    addressUrl,
    appUrl,
    explorerBaseUrl: explorerBaseUrl(),
  };
}
