import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "algoease-backend",
    version: "v2",
    timestamp: new Date().toISOString(),
  });
});
