import { Router } from "express";
import { db, obstaclesTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";

const router = Router();

const issueTypes = ["elevator_down", "wet_floor", "blocked_ramp", "construction", "missing_signage", "other"] as const;
const statuses = ["active", "dismissed", "escalated", "expired"] as const;

function assignSeverity(issueType: string): string {
  if (issueType === "elevator_down" || issueType === "blocked_ramp") return "high";
  if (issueType === "wet_floor" || issueType === "construction") return "medium";
  return "low";
}

// GET /obstacles
router.get("/", async (req, res) => {
  try {
    const active = req.query.active === "true";
    const zone = req.query.zone as string | undefined;

    // Expire old obstacles
    await db
      .update(obstaclesTable)
      .set({ status: "expired" })
      .where(and(eq(obstaclesTable.status, "active"), lt(obstaclesTable.expiresAt, new Date())));

    let obstacles = await db.select().from(obstaclesTable).orderBy(obstaclesTable.createdAt);

    if (active) {
      obstacles = obstacles.filter((o) => o.status === "active");
    }
    if (zone) {
      obstacles = obstacles.filter((o) => o.zone === zone);
    }

    res.json(obstacles);
  } catch (err) {
    req.log.error({ err }, "Failed to list obstacles");
    res.status(500).json({ error: "Failed to list obstacles" });
  }
});

// POST /obstacles
router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      reporterName: z.string().min(1),
      zone: z.string().min(1),
      issueType: z.enum(issueTypes),
      description: z.string().min(1),
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
    });
    const data = schema.parse(req.body);

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
    const severity = assignSeverity(data.issueType);

    const [obstacle] = await db
      .insert(obstaclesTable)
      .values({ ...data, severity, expiresAt })
      .returning();

    res.status(201).json(obstacle);
  } catch (err) {
    req.log.error({ err }, "Failed to create obstacle");
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to create obstacle" });
  }
});

// GET /obstacles/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [obstacle] = await db.select().from(obstaclesTable).where(eq(obstaclesTable.id, id));
    if (!obstacle) return res.status(404).json({ error: "Not found" });
    res.json(obstacle);
  } catch (err) {
    req.log.error({ err }, "Failed to get obstacle");
    res.status(500).json({ error: "Failed to get obstacle" });
  }
});

// POST /obstacles/:id/confirm
router.post("/:id/confirm", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [existing] = await db.select().from(obstaclesTable).where(eq(obstaclesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });

    const newConfirmations = existing.confirmations + 1;
    const [updated] = await db
      .update(obstaclesTable)
      .set({ confirmations: newConfirmations })
      .where(eq(obstaclesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to confirm obstacle");
    res.status(500).json({ error: "Failed to confirm obstacle" });
  }
});

// POST /obstacles/:id/dismiss
router.post("/:id/dismiss", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(obstaclesTable)
      .set({ status: "dismissed" })
      .where(eq(obstaclesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to dismiss obstacle");
    res.status(500).json({ error: "Failed to dismiss obstacle" });
  }
});

// POST /obstacles/:id/escalate
router.post("/:id/escalate", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(obstaclesTable)
      .set({ status: "escalated", severity: "high" })
      .where(eq(obstaclesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to escalate obstacle");
    res.status(500).json({ error: "Failed to escalate obstacle" });
  }
});

export default router;
