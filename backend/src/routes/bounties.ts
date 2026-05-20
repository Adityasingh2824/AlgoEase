/**
 * Public bounties listing route.
 */
import { Router } from "express";
import { getDb } from "../db/index.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await getDb()
      .from("bounties")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ bounties: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export { router as bountiesRouter };
