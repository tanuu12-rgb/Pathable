import { Router } from "express";
import { db, wellbeingCheckinsTable } from "@workspace/db";
import { eq, desc, gte } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// POST /wellbeing/checkin
router.post("/checkin", async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      mood: z.enum(["energetic", "moderate", "low_energy", "stressed"]),
      checkinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    const data = schema.parse(req.body);
    const [checkin] = await db.insert(wellbeingCheckinsTable).values(data).returning();
    res.status(201).json(checkin);
  } catch (err) {
    req.log.error({ err }, "Failed to submit wellbeing checkin");
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to submit wellbeing checkin" });
  }
});

// GET /wellbeing/history/:userId
router.get("/history/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split("T")[0];

    const checkins = await db
      .select()
      .from(wellbeingCheckinsTable)
      .where(eq(wellbeingCheckinsTable.userId, userId))
      .orderBy(desc(wellbeingCheckinsTable.checkinDate))
      .limit(7);

    res.json({ checkins });
  } catch (err) {
    req.log.error({ err }, "Failed to get wellbeing history");
    res.status(500).json({ error: "Failed to get wellbeing history" });
  }
});

export default router;
