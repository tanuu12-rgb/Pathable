import { Router } from "express";
import { db, safeRoomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function computeStatus(occupancy: number, capacity: number): string {
  if (occupancy === 0) return "available";
  if (occupancy >= capacity) return "full";
  return "partially_occupied";
}

// GET /safe-rooms
router.get("/", async (req, res) => {
  try {
    const rooms = await db.select().from(safeRoomsTable).orderBy(safeRoomsTable.building);
    res.json(rooms);
  } catch (err) {
    req.log.error({ err }, "Failed to list safe rooms");
    res.status(500).json({ error: "Failed to list safe rooms" });
  }
});

// POST /safe-rooms/:id/checkin
router.post("/:id/checkin", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [room] = await db.select().from(safeRoomsTable).where(eq(safeRoomsTable.id, id));
    if (!room) return res.status(404).json({ error: "Not found" });
    if (room.currentOccupancy >= room.capacity) {
      return res.status(400).json({ error: "Room is full" });
    }
    const newOccupancy = room.currentOccupancy + 1;
    const [updated] = await db
      .update(safeRoomsTable)
      .set({ currentOccupancy: newOccupancy, status: computeStatus(newOccupancy, room.capacity) })
      .where(eq(safeRoomsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to check in");
    res.status(500).json({ error: "Failed to check in" });
  }
});

// POST /safe-rooms/:id/checkout
router.post("/:id/checkout", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [room] = await db.select().from(safeRoomsTable).where(eq(safeRoomsTable.id, id));
    if (!room) return res.status(404).json({ error: "Not found" });
    const newOccupancy = Math.max(0, room.currentOccupancy - 1);
    const [updated] = await db
      .update(safeRoomsTable)
      .set({ currentOccupancy: newOccupancy, status: computeStatus(newOccupancy, room.capacity) })
      .where(eq(safeRoomsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to check out");
    res.status(500).json({ error: "Failed to check out" });
  }
});

export default router;
