import { Router } from "express";
import { db, sosAlertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /sos
router.get("/", async (req, res) => {
  try {
    const active = req.query.active === "true";
    let alerts = await db.select().from(sosAlertsTable).orderBy(sosAlertsTable.createdAt);
    if (active) {
      alerts = alerts.filter((a) => a.status === "active");
    }
    res.json(alerts);
  } catch (err) {
    req.log.error({ err }, "Failed to list SOS alerts");
    res.status(500).json({ error: "Failed to list SOS alerts" });
  }
});

// POST /sos
router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      studentName: z.string().min(1),
      zone: z.string().min(1),
      disabilityType: z.string().min(1),
      notes: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const [alert] = await db.insert(sosAlertsTable).values(data).returning();
    res.status(201).json(alert);
  } catch (err) {
    req.log.error({ err }, "Failed to create SOS alert");
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to create SOS alert" });
  }
});

// POST /sos/:id/resolve
router.post("/:id/resolve", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(sosAlertsTable)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(sosAlertsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to resolve SOS alert");
    res.status(500).json({ error: "Failed to resolve SOS alert" });
  }
});

export default router;
