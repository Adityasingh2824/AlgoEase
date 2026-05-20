import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { escrowRouter } from "./routes/escrow.js";
import { bountiesRouter } from "./routes/bounties.js";
import { healthRouter } from "./routes/health.js";
import { getCurrentEscrowAppId, getEscrowAppAddress } from "./lib/algorand-config.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/api", (_req, res) => {
    const escrowAppId = getCurrentEscrowAppId();
    res.json({
      name: "AlgoEase API",
      version: "v2",
      stack: "Node + Express + x402",
      contracts: "AlgoPy BoxMap",
      escrowAppId,
      escrowAppAddress: getEscrowAppAddress(escrowAppId),
    });
  });
  app.use("/api/health", healthRouter);
  app.use("/escrow", escrowRouter);
  app.use("/api/bounties", bountiesRouter);

  return app;
}
