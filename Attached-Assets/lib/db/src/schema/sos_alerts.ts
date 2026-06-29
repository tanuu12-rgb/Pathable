import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sosAlertsTable = pgTable("sos_alerts", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  zone: text("zone").notNull(),
  disabilityType: text("disability_type").notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const insertSosAlertSchema = createInsertSchema(sosAlertsTable).omit({ id: true, createdAt: true });
export type InsertSosAlert = z.infer<typeof insertSosAlertSchema>;
export type SosAlert = typeof sosAlertsTable.$inferSelect;
