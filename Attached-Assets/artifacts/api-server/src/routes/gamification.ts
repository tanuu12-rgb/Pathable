import { Router } from "express";
import { db, gamificationProfilesTable, earnedBadgesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const ALL_BADGES = [
  { id: "first_responder", name: "First Responder", description: "Submit your first obstacle report" },
  { id: "safety_guardian", name: "Safety Guardian", description: "Get 10 reports approved by the community" },
  { id: "community_pillar", name: "Community Pillar", description: "Confirm 50 reports from other users" },
  { id: "navigator", name: "Navigator", description: "Complete 20 accessible routes" },
  { id: "streak_master", name: "Streak Master", description: "Use PathAble 5 days in a row" },
];

async function getOrCreateProfile(userId: string) {
  const [existing] = await db
    .select()
    .from(gamificationProfilesTable)
    .where(eq(gamificationProfilesTable.userId, userId));
  if (existing) return existing;

  const displayName = `User_${userId.substring(0, 6)}`;
  const [created] = await db
    .insert(gamificationProfilesTable)
    .values({ userId, displayName, points: 10 }) // 10 pts for profile setup
    .returning();
  return created;
}

// GET /gamification/leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const profiles = await db
      .select()
      .from(gamificationProfilesTable)
      .orderBy(desc(gamificationProfilesTable.points))
      .limit(10);

    const leaderboard = await Promise.all(
      profiles.map(async (p, i) => {
        const badges = await db
          .select()
          .from(earnedBadgesTable)
          .where(eq(earnedBadgesTable.userId, p.userId));
        return {
          rank: i + 1,
          displayName: p.displayName,
          points: p.points,
          badgeCount: badges.length,
        };
      })
    );

    res.json(leaderboard);
  } catch (err) {
    req.log.error({ err }, "Failed to get leaderboard");
    res.status(500).json({ error: "Failed to get leaderboard" });
  }
});

// GET /gamification/profile/:userId
router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await getOrCreateProfile(userId);

    const earnedBadgeRows = await db
      .select()
      .from(earnedBadgesTable)
      .where(eq(earnedBadgesTable.userId, userId));

    const earnedBadgeIds = new Set(earnedBadgeRows.map((b) => b.badgeId));

    const badges = ALL_BADGES.map((b) => {
      const earned = earnedBadgeIds.has(b.id);
      const earnedRow = earnedBadgeRows.find((r) => r.badgeId === b.id);
      return {
        id: b.id,
        name: b.name,
        description: b.description,
        earned,
        earnedAt: earned && earnedRow ? earnedRow.earnedAt.toISOString() : null,
      };
    });

    res.json({
      userId: profile.userId,
      displayName: profile.displayName,
      points: profile.points,
      badges,
      reportsSubmitted: profile.reportsSubmitted,
      reportsConfirmed: profile.reportsConfirmed,
      routesCompleted: profile.routesCompleted,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get gamification profile");
    res.status(500).json({ error: "Failed to get gamification profile" });
  }
});

export default router;
