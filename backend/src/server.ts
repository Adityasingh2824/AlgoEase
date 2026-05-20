import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { getCurrentEscrowAppId, getEscrowAppAddress } from "./lib/algorand-config.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.join(rootDir, "backend", ".env") });

const app = createApp();
const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  const appId = getCurrentEscrowAppId();
  console.log(`AlgoEase backend listening on http://localhost:${port}`);
  console.log(`Escrow app ${appId} → ${getEscrowAppAddress(appId)}`);
});
