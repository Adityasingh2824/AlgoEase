import "dotenv/config";
import algosdk from "algosdk";

async function main() {
  const server = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
  const port = process.env.ALGOD_PORT ?? "443";
  const token = process.env.ALGOD_TOKEN ?? "";

  const client = new algosdk.Algodv2(token, server, port);
  const status = await client.status().do();
  console.log("AlgoEase v2 testnet smoke check");
  console.log(`Last round: ${status["last-round"]}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
