import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gamificationProfilesTable = pgTable("gamification_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  points: integer("points").notNull().default(0),
  reportsSubmitted: integer("reports_submitted").notNull().default(0),
  reportsConfirmed: integer("reports_confirmed").notNull().default(0),
  routesCompleted: integer("routes_completed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const earnedBadgesTable = pgTable("earned_badges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  badgeId: text("badge_id").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGamificationProfileSchema = createInsertSchema(gamificationProfilesTable).omit({ id: true, createdAt: true });
export type InsertGamificationProfile = z.infer<typeof insertGamificationProfileSchema>;
export type GamificationProfile = typeof gamificationProfilesTable.$inferSelect;
export type EarnedBadge = typeof earnedBadgesTable.$inferSelect;
