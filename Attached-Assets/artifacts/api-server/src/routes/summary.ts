import { Router } from "express";
import { db, obstaclesTable, sosAlertsTable, campusAlertsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";

const router = Router();

// GET /summary/admin
router.get("/admin", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [todayObstacles, sosThisWeek, totalActiveAlerts, zoneRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(obstaclesTable)
        .where(and(eq(obstaclesTable.status, "active"), gte(obstaclesTable.createdAt, today))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(sosAlertsTable)
        .where(gte(sosAlertsTable.createdAt, weekAgo)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(campusAlertsTable)
        .where(eq(campusAlertsTable.status, "active")),
      db
        .select({ zone: obstaclesTable.zone, count: sql<number>`count(*)::int` })
        .from(obstaclesTable)
        .groupBy(obstaclesTable.zone)
        .orderBy(sql`count(*) desc`)
        .limit(1),
    ]);

    const mostReportedZone = zoneRows.length > 0 ? zoneRows[0].zone : "None";

    res.json({
      activeIncidentsToday: todayObstacles[0]?.count ?? 0,
      sosEventsThisWeek: sosThisWeek[0]?.count ?? 0,
      mostReportedZone,
      avgResolutionMinutes: null,
      totalActiveAlerts: totalActiveAlerts[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get admin summary");
    res.status(500).json({ error: "Failed to get admin summary" });
  }
});

// GET /summary/zones
router.get("/zones", async (req, res) => {
  try {
    const rows = await db
      .select({
        zone: obstaclesTable.zone,
        incidentCount: sql<number>`count(*)::int`,
        lastReported: sql<string>`max(${obstaclesTable.createdAt})`,
      })
      .from(obstaclesTable)
      .groupBy(obstaclesTable.zone)
      .orderBy(sql`count(*) desc`);

    res.json(
      rows.map((r) => ({
        zone: r.zone,
        incidentCount: r.incidentCount,
        lastReported: r.lastReported ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get zone summary");
    res.status(500).json({ error: "Failed to get zone summary" });
  }
});

export default router;
