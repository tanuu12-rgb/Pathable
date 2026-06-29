import { pgTable, text, serial, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const safeZonesTable = pgTable("safe_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  approved: boolean("approved").notNull().default(true),
});

export const insertSafeZoneSchema = createInsertSchema(safeZonesTable).omit({ id: true });
export type InsertSafeZone = z.infer<typeof insertSafeZoneSchema>;
export type SafeZone = typeof safeZonesTable.$inferSelect;
