import { Router } from "express";
import { db, campusAlertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /admin/alerts
router.get("/alerts", async (req, res) => {
  try {
    const alerts = await db.select().from(campusAlertsTable).orderBy(campusAlertsTable.createdAt);
    res.json(alerts);
  } catch (err) {
    req.log.error({ err }, "Failed to list campus alerts");
    res.status(500).json({ error: "Failed to list campus alerts" });
  }
});

// POST /admin/alerts
router.post("/alerts", async (req, res) => {
  try {
    const schema = z.object({
      message: z.string().min(1),
      createdBy: z.string().min(1),
      alertType: z.enum(["safety", "maintenance", "general"]).optional().default("general"),
    });
    const data = schema.parse(req.body);
    const [alert] = await db.insert(campusAlertsTable).values(data).returning();
    res.status(201).json(alert);
  } catch (err) {
    req.log.error({ err }, "Failed to create campus alert");
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to create campus alert" });
  }
});

// POST /admin/alerts/:id/dismiss
router.post("/alerts/:id/dismiss", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(campusAlertsTable)
      .set({ status: "dismissed" })
      .where(eq(campusAlertsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to dismiss campus alert");
    res.status(500).json({ error: "Failed to dismiss campus alert" });
  }
});

export default router;
