import { Router } from "express";
import { db, safeZonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /safe-zones
router.get("/", async (req, res) => {
  try {
    const zones = await db
      .select()
      .from(safeZonesTable)
      .where(eq(safeZonesTable.approved, true))
      .orderBy(safeZonesTable.name);
    res.json(zones);
  } catch (err) {
    req.log.error({ err }, "Failed to list safe zones");
    res.status(500).json({ error: "Failed to list safe zones" });
  }
});

export default router;
