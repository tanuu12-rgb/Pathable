import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campusAlertsTable = pgTable("campus_alerts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  createdBy: text("created_by").notNull(),
  alertType: text("alert_type").notNull().default("general"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCampusAlertSchema = createInsertSchema(campusAlertsTable).omit({ id: true, createdAt: true });
export type InsertCampusAlert = z.infer<typeof insertCampusAlertSchema>;
export type CampusAlert = typeof campusAlertsTable.$inferSelect;
