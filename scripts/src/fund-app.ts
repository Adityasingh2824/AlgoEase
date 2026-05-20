/**
 * Seed an escrow app account with ALGO for box MBR + inner payout fees.
 *
 * Usage:
 *   npx tsx scripts/src/fund-app.ts [appId] [microAlgos]
 *
 * Defaults: ALGORAND_APP_ID from env, 500000 microAlgos.
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import algosdk from "algosdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, "backend/.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

async function main() {
  const appId = Number(process.argv[2] ?? process.env.ALGORAND_APP_ID ?? process.env.ESCROW_APP_ID);
  const amount = Number(process.argv[3] ?? process.env.APP_MBR_SEED_MICROALGOS ?? "500000");
  if (!Number.isFinite(appId) || appId <= 0) throw new Error("Invalid app id");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const server = process.env.ALGOD_SERVER ?? process.env.ALGORAND_ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
  const port = process.env.ALGOD_PORT ?? process.env.ALGORAND_ALGOD_PORT ?? "443";
  const token = process.env.ALGOD_TOKEN ?? process.env.ALGORAND_ALGOD_TOKEN ?? "";
  const mnemonic = requireEnv("DEPLOYER_MNEMONIC");

  const deployer = algosdk.mnemonicToSecretKey(mnemonic);
  const client = new algosdk.Algodv2(token, server, port);
  const appAddress = algosdk.getApplicationAddress(appId);

  const before = await client.accountInformation(appAddress).do();
  const params = await client.getTransactionParams().do();
  const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: deployer.addr,
    receiver: appAddress,
    amount,
    suggestedParams: params,
    note: new Uint8Array(Buffer.from("algoease:app-mbr-seed")),
  });
  const signed = fundTxn.signTxn(deployer.sk);
  const txId = fundTxn.txID();
  await client.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(client, txId, 8);

  const after = await client.accountInformation(appAddress).do();
  console.log(`Funded app ${appId} (${appAddress})`);
  console.log(`Amount: ${amount} microAlgos`);
  console.log(`TX: ${txId}`);
  console.log(`Balance: ${before.amount} → ${after.amount}`);
  console.log(`Min balance: ${after["min-balance"] ?? after.minBalance}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
