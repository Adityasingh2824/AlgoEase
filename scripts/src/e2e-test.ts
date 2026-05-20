/**
 * AlgoEase v2 — End-to-end test on testnet.
 *
 * Runs the full escrow lifecycle: create → accept → submit → approve → release.
 * Requires DEPLOYER_MNEMONIC and ALGORAND_APP_ID in env.
 *
 * Usage: npx tsx scripts/src/e2e-test.ts
 */
import "dotenv/config";
import algosdk from "algosdk";

function escrowBoxNameBytes(taskId: string): Uint8Array {
  const encodedKey = new algosdk.ABIStringType().encode(taskId);
  const prefix = new TextEncoder().encode("esc");
  const name = new Uint8Array(prefix.length + encodedKey.length);
  name.set(prefix);
  name.set(encodedKey, prefix.length);
  return name;
}

const ALGOD_SERVER = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
const ALGOD_PORT = process.env.ALGOD_PORT ?? "";
const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const APP_ID = Number(process.env.ALGORAND_APP_ID ?? process.env.ESCROW_APP_ID ?? "0");
const MNEMONIC = process.env.DEPLOYER_MNEMONIC ?? "";

if (!MNEMONIC) throw new Error("Set DEPLOYER_MNEMONIC in .env");
if (!APP_ID) throw new Error("Set ALGORAND_APP_ID or ESCROW_APP_ID in .env");

const client = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
const deployer = algosdk.mnemonicToSecretKey(MNEMONIC.trim());
const signer = algosdk.makeBasicAccountTransactionSigner(deployer);

// For testing, we use deployer as both client and create a separate freelancer
const freelancerMnemonic = algosdk.secretKeyToMnemonic(algosdk.generateAccount().sk);
const freelancer = algosdk.mnemonicToSecretKey(freelancerMnemonic);
const freelancerSigner = algosdk.makeBasicAccountTransactionSigner(freelancer);

const TASK_ID = `e2e-${Date.now()}`;
const AMOUNT = 100_000; // 0.1 ALGO
const DEADLINE = Math.floor(Date.now() / 1000) + 3600; // 1 hour

function getABIMethods() {
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
    getStatus: new algosdk.ABIMethod({
      name: "get_status",
      args: [{ type: "string", name: "task_id" }],
      returns: { type: "uint64" },
    }),
  };
}

function withCoveredInnerFee(params: algosdk.SuggestedParams): algosdk.SuggestedParams {
  const minFee = typeof params.minFee === "bigint" ? Number(params.minFee) : Number(params.minFee ?? 1000);
  return { ...params, flatFee: true, fee: minFee * 2 };
}

async function fundFreelancer() {
  console.log("  Funding freelancer account...");
  const params = await client.getTransactionParams().do();
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: deployer.addr,
    receiver: freelancer.addr,
    amount: 500_000, // 0.5 ALGO for fees
    suggestedParams: params,
  });
  const signed = txn.signTxn(deployer.sk);
  const { txid } = await client.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(client, txid, 4);
  console.log(`  Funded: ${txid}`);
}

async function step(name: string, fn: () => Promise<string>) {
  process.stdout.write(`  ${name}... `);
  const txId = await fn();
  console.log(`OK (${txId})`);
  return txId;
}

async function main() {
  const appAddress = algosdk.getApplicationAddress(APP_ID);
  const methods = getABIMethods();
  const boxName = escrowBoxNameBytes(TASK_ID);

  console.log("AlgoEase v2 E2E Test");
  console.log(`  App ID: ${APP_ID}`);
  console.log(`  App Address: ${appAddress}`);
  console.log(`  Client: ${deployer.addr}`);
  console.log(`  Freelancer: ${freelancer.addr}`);
  console.log(`  Task ID: ${TASK_ID}`);
  console.log("");

  await fundFreelancer();

  // 1. Create Escrow
  await step("create_escrow", async () => {
    const params = await client.getTransactionParams().do();
    const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: deployer.addr,
      receiver: appAddress,
      amount: AMOUNT,
      suggestedParams: params,
    });

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: APP_ID,
      method: methods.createEscrow,
      methodArgs: [TASK_ID, freelancer.addr.toString(), DEADLINE, 0, { txn: payTxn, signer }],
      sender: deployer.addr,
      suggestedParams: params,
      signer,
      boxes: [{ appIndex: APP_ID, name: boxName }],
    });

    const result = await atc.execute(client, 4);
    return result.txIDs[0];
  });

  // 2. Accept Task
  await step("accept_task", async () => {
    const params = await client.getTransactionParams().do();
    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: APP_ID,
      method: methods.acceptTask,
      methodArgs: [TASK_ID],
      sender: freelancer.addr,
      suggestedParams: params,
      signer: freelancerSigner,
      boxes: [{ appIndex: APP_ID, name: boxName }],
    });
    const result = await atc.execute(client, 4);
    return result.txIDs[0];
  });

  // 3. Submit Work
  await step("submit_work", async () => {
    const params = await client.getTransactionParams().do();
    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: APP_ID,
      method: methods.submitWork,
      methodArgs: [TASK_ID, "ipfs://bafkreitest123"],
      sender: freelancer.addr,
      suggestedParams: params,
      signer: freelancerSigner,
      boxes: [{ appIndex: APP_ID, name: boxName }],
    });
    const result = await atc.execute(client, 4);
    return result.txIDs[0];
  });

  // 4. Approve
  await step("approve", async () => {
    const params = await client.getTransactionParams().do();
    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: APP_ID,
      method: methods.approve,
      methodArgs: [TASK_ID],
      sender: deployer.addr,
      suggestedParams: params,
      signer,
      boxes: [{ appIndex: APP_ID, name: boxName }],
    });
    const result = await atc.execute(client, 4);
    return result.txIDs[0];
  });

  // 5. Release Payment
  await step("release_payment", async () => {
    const params = await client.getTransactionParams().do();
    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: APP_ID,
      method: methods.releasePayment,
      methodArgs: [TASK_ID],
      sender: deployer.addr,
      suggestedParams: withCoveredInnerFee(params),
      signer,
      boxes: [{ appIndex: APP_ID, name: boxName }],
      appAccounts: [freelancer.addr.toString()],
    });
    const result = await atc.execute(client, 4);
    return result.txIDs[0];
  });

  // 6. Verify final status
  await step("get_status (verify RELEASED=5)", async () => {
    const params = await client.getTransactionParams().do();
    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: APP_ID,
      method: methods.getStatus,
      methodArgs: [TASK_ID],
      sender: deployer.addr,
      suggestedParams: params,
      signer,
      boxes: [{ appIndex: APP_ID, name: boxName }],
    });
    const result = await atc.execute(client, 4);
    const status = result.methodResults[0].returnValue;
    if (Number(status) !== 5) {
      throw new Error(`Expected status 5 (RELEASED), got ${status}`);
    }
    return `status=${status}`;
  });

  console.log("\nAll steps passed! Full escrow lifecycle completed successfully.");
}

main().catch((err) => {
  console.error("\nE2E FAILED:", err.message ?? err);
  process.exit(1);
});
