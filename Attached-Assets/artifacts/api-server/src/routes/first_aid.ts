import { Router } from "express";
import { db, firstAidResourcesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// GET /first-aid
router.get("/", async (req, res) => {
  try {
    const resources = await db.select().from(firstAidResourcesTable).orderBy(firstAidResourcesTable.building);
    res.json(resources);
  } catch (err) {
    req.log.error({ err }, "Failed to list first aid resources");
    res.status(500).json({ error: "Failed to list first aid resources" });
  }
});

// PATCH /first-aid/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const schema = z.object({
      status: z.enum(["available", "needs_restock", "out_of_service"]),
    });
    const { status } = schema.parse(req.body);
    const [updated] = await db
      .update(firstAidResourcesTable)
      .set({ status })
      .where(eq(firstAidResourcesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update first aid status");
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to update first aid status" });
  }
});

export default router;
