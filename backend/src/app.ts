import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { escrowRouter } from "./routes/escrow.js";
import { healthRouter } from "./routes/health.js";

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
    res.json({ name: "AlgoEase API", stack: "Node + Express", contracts: "AlgoPy" });
  });
  app.use("/api/health", healthRouter);
  app.use("/escrow", escrowRouter);

  return app;
}
