import "dotenv/config";
import algosdk from "algosdk";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function mask(value: string | undefined) {
  if (!value) return "not-set";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function toNumber(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid numeric value for ${name}: ${value}`);
  }
  return parsed;
}

async function main() {
  const server = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
  const port = process.env.ALGOD_PORT ?? "";
  const token = process.env.ALGOD_TOKEN ?? "";
  const mnemonic = requireEnv("DEPLOYER_MNEMONIC");
  const approvalPath = resolve(
    process.env.APPROVAL_PROGRAM_PATH ?? "../contracts/src/EscrowContract.approval.teal",
  );
  const clearPath = resolve(process.env.CLEAR_PROGRAM_PATH ?? "../contracts/src/EscrowContract.clear.teal");
  const numGlobalInts = toNumber(process.env.NUM_GLOBAL_INTS ?? "2", "NUM_GLOBAL_INTS");
  const numGlobalByteSlices = toNumber(
    process.env.NUM_GLOBAL_BYTE_SLICES ?? "3",
    "NUM_GLOBAL_BYTE_SLICES",
  );
  const numLocalInts = toNumber(process.env.NUM_LOCAL_INTS ?? "0", "NUM_LOCAL_INTS");
  const numLocalByteSlices = toNumber(process.env.NUM_LOCAL_BYTE_SLICES ?? "0", "NUM_LOCAL_BYTE_SLICES");

  const deployer = algosdk.mnemonicToSecretKey(mnemonic.trim());
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
    numGlobalInts,
    numGlobalByteSlices,
    numLocalInts,
    numLocalByteSlices,
    suggestedParams: params,
  });

  const txId = appCreateTxn.txID();
  const signedTxn = appCreateTxn.signTxn(deployer.sk);
  await client.sendRawTransaction(signedTxn).do();

  console.log("AlgoEase v2 deploy");
  console.log(`ALGOD_SERVER=${server}`);
  console.log(`ALGOD_PORT=${port}`);
  console.log(`ALGOD_TOKEN=${mask(token)}`);
  console.log(`DEPLOYER_ADDRESS=${deployer.addr}`);
  console.log(`TX_ID=${txId}`);

  const confirmation = await algosdk.waitForConfirmation(client, txId, 8);
  const appId = confirmation.applicationIndex;
  if (!appId) {
    throw new Error("Deployment confirmed but applicationIndex missing from pending transaction");
  }
  console.log(`ALGORAND_APP_ID=${appId}`);
  console.log("Set backend/.env -> ALGORAND_APP_ID to this value.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
