/**
 * Deploy AlgoEase v2 BoxMap EscrowContract to Algorand testnet/mainnet.
 *
 * Prerequisites:
 *   1. npm run contracts:compile  (produces contracts/algoease_escrow/build/*.teal)
 *   2. Root .env with DEPLOYER_MNEMONIC (funded account)
 */
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
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
  const server = process.env.ALGOD_SERVER ?? process.env.ALGORAND_ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
  const port = process.env.ALGOD_PORT ?? process.env.ALGORAND_ALGOD_PORT ?? "443";
  const token = process.env.ALGOD_TOKEN ?? process.env.ALGORAND_ALGOD_TOKEN ?? "";

  const mnemonic = requireEnv("DEPLOYER_MNEMONIC");
  const approvalPath = resolve(
    process.env.APPROVAL_PROGRAM_PATH ?? resolve(repoRoot, "contracts/algoease_escrow/build/EscrowContract.approval.teal"),
  );
  const clearPath = resolve(
    process.env.CLEAR_PROGRAM_PATH ?? resolve(repoRoot, "contracts/algoease_escrow/build/EscrowContract.clear.teal"),
  );

  const deployer = algosdk.mnemonicToSecretKey(mnemonic);
  const client = new algosdk.Algodv2(token, server, port);

  const [approvalSource, clearSource] = await Promise.all([
    readFile(approvalPath, "utf8"),
    readFile(clearPath, "utf8"),
  ]);

  const [approvalCompiled, clearCompiled] = await Promise.all([
    client.compile(approvalSource).do(),
    client.compile(clearSource).do(),
  ]);

  const approvalProgram = new Uint8Array(Buffer.from(approvalCompiled.result, "base64"));
  const clearProgram = new Uint8Array(Buffer.from(clearCompiled.result, "base64"));

  const params = await client.getTransactionParams().do();
  const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
    sender: deployer.addr,
    approvalProgram,
    clearProgram,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    numGlobalInts: 1,
    numGlobalByteSlices: 0,
    numLocalInts: 0,
    numLocalByteSlices: 0,
    extraPages: 3,
    suggestedParams: params,
  });

  const signedTxn = appCreateTxn.signTxn(deployer.sk);
  const txId = appCreateTxn.txID();
  await client.sendRawTransaction(signedTxn).do();

  console.log("AlgoEase v2 BoxMap deploy");
  console.log(`Network: ${server}`);
  console.log(`Deployer: ${deployer.addr}`);
  console.log(`TX_ID: ${txId}`);

  const confirmation = await algosdk.waitForConfirmation(client, txId, 8);
  const appId = confirmation.applicationIndex;
  if (!appId) {
    throw new Error("Deployment confirmed but applicationIndex missing");
  }

  const appIdNum = Number(appId);
  const appAddress = algosdk.getApplicationAddress(appIdNum);
  const mbrSeedMicroAlgos = Number(process.env.APP_MBR_SEED_MICROALGOS ?? "500000");

  const fundParams = await client.getTransactionParams().do();
  const fundTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: deployer.addr,
    receiver: appAddress,
    amount: mbrSeedMicroAlgos,
    suggestedParams: fundParams,
    note: new Uint8Array(Buffer.from("algoease:app-mbr-seed")),
  });
  const fundSigned = fundTxn.signTxn(deployer.sk);
  const fundTxId = fundTxn.txID();
  await client.sendRawTransaction(fundSigned).do();
  await algosdk.waitForConfirmation(client, fundTxId, 8);

  console.log("");
  console.log("=== Deployment successful ===");
  console.log(`ALGORAND_APP_ID=${appIdNum}`);
  console.log(`ESCROW_APP_ID=${appIdNum}`);
  console.log(`App address: ${appAddress}`);
  console.log(`MBR seed: ${mbrSeedMicroAlgos} microAlgos (tx ${fundTxId})`);
  console.log("");
  console.log("Add to backend/.env and root .env:");
  console.log(`  ALGORAND_APP_ID=${appIdNum}`);
  console.log(`  ALGORAND_DEFAULT_MNEMONIC=<same as DEPLOYER_MNEMONIC for dev>`);
  console.log("");
  console.log("Optional: call configure(usdc_asset_id) on-chain after deploy.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
