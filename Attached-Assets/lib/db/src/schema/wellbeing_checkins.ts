import { pgTable, text, serial, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wellbeingCheckinsTable = pgTable("wellbeing_checkins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  mood: text("mood").notNull(),
  checkinDate: date("checkin_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWellbeingCheckinSchema = createInsertSchema(wellbeingCheckinsTable).omit({ id: true, createdAt: true });
export type InsertWellbeingCheckin = z.infer<typeof insertWellbeingCheckinSchema>;
export type WellbeingCheckin = typeof wellbeingCheckinsTable.$inferSelect;
