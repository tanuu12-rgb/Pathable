import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const obstaclesTable = pgTable("obstacles", {
  id: serial("id").primaryKey(),
  reporterName: text("reporter_name").notNull(),
  zone: text("zone").notNull(),
  issueType: text("issue_type").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("active"),
  confirmations: integer("confirmations").notNull().default(0),
  severity: text("severity"),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const insertObstacleSchema = createInsertSchema(obstaclesTable).omit({ id: true, createdAt: true });
export type InsertObstacle = z.infer<typeof insertObstacleSchema>;
export type Obstacle = typeof obstaclesTable.$inferSelect;
