import { pgTable, text, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const safeRoomsTable = pgTable("safe_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  building: text("building").notNull(),
  floor: integer("floor").notNull(),
  roomNumber: text("room_number").notNull(),
  equipment: text("equipment").array().notNull().default([]),
  openingHours: text("opening_hours").notNull(),
  status: text("status").notNull().default("available"),
  currentOccupancy: integer("current_occupancy").notNull().default(0),
  capacity: integer("capacity").notNull().default(4),
  lat: real("lat"),
  lng: real("lng"),
});

export const insertSafeRoomSchema = createInsertSchema(safeRoomsTable).omit({ id: true });
export type InsertSafeRoom = z.infer<typeof insertSafeRoomSchema>;
export type SafeRoom = typeof safeRoomsTable.$inferSelect;
