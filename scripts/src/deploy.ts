import "dotenv/config";

function mask(value: string | undefined) {
  if (!value) return "not-set";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function main() {
  const server = process.env.ALGOD_SERVER ?? "https://testnet-api.algonode.cloud";
  const port = process.env.ALGOD_PORT ?? "443";
  const token = process.env.ALGOD_TOKEN ?? "";

  console.log("AlgoEase v2 deploy scaffold");
  console.log(`ALGOD_SERVER=${server}`);
  console.log(`ALGOD_PORT=${port}`);
  console.log(`ALGOD_TOKEN=${mask(token)}`);
  console.log("Next: wire AlgoPy contract artifacts and deployment transaction flow.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
