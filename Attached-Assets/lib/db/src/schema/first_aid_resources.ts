import { pgTable, text, serial, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const firstAidResourcesTable = pgTable("first_aid_resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  building: text("building").notNull(),
  location: text("location").notNull(),
  stocked: text("stocked").array().notNull().default([]),
  lastInspection: date("last_inspection", { mode: "string" }).notNull(),
  status: text("status").notNull().default("available"),
  lat: real("lat"),
  lng: real("lng"),
});

export const insertFirstAidResourceSchema = createInsertSchema(firstAidResourcesTable).omit({ id: true });
export type InsertFirstAidResource = z.infer<typeof insertFirstAidResourceSchema>;
export type FirstAidResource = typeof firstAidResourcesTable.$inferSelect;
