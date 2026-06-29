import { Router } from "express";
import { z } from "zod";

const router = Router();

// Campus knowledge base for Lakewood University
const CAMPUS_KB = {
  buildings: [
    { name: "Library", accessible: true, entrances: ["Main entrance (ramp)", "East entrance (automatic door)"], elevators: true, accessibleRestrooms: "Floor 1, Floor 2, Floor 3" },
    { name: "Science Block", accessible: true, entrances: ["North entrance (ramp)", "South entrance (step-free)"], elevators: true, accessibleRestrooms: "Floor 1, Floor 3" },
    { name: "Engineering Hall", accessible: true, entrances: ["Main entrance (ramp)"], elevators: true, accessibleRestrooms: "Floor 1, Floor 2" },
    { name: "Student Centre", accessible: true, entrances: ["Main entrance (automatic sliding door)"], elevators: true, accessibleRestrooms: "Ground floor" },
    { name: "Admin Building", accessible: true, entrances: ["Main entrance (ramp)"], elevators: false, accessibleRestrooms: "Ground floor" },
    { name: "Medical Centre", accessible: true, entrances: ["Main entrance (fully step-free)"], elevators: true, accessibleRestrooms: "All floors" },
    { name: "Sports Complex", accessible: true, entrances: ["Main gate (wide automatic doors)"], elevators: false, accessibleRestrooms: "Ground floor" },
    { name: "Cafeteria", accessible: true, entrances: ["Main entrance (automatic door)"], elevators: false, accessibleRestrooms: "Ground floor" },
    { name: "Block A", accessible: true, entrances: ["Side entrance (ramp)"], elevators: true, accessibleRestrooms: "Floor 1" },
    { name: "Block B", accessible: true, entrances: ["Main entrance (step-free)"], elevators: true, accessibleRestrooms: "Floor 1, Floor 2" },
    { name: "Block C", accessible: true, entrances: ["East entrance (ramp)"], elevators: false, accessibleRestrooms: "Ground floor" },
  ],
  safeRooms: [
    { name: "Sensory Room 1", building: "Student Centre", floor: 2, room: "SC-201", hours: "8am–8pm Mon–Fri" },
    { name: "Quiet Space", building: "Library", floor: 3, room: "L-301", hours: "9am–9pm daily" },
    { name: "Wellbeing Room", building: "Medical Centre", floor: 1, room: "MC-102", hours: "24/7" },
  ],
  firstAid: [
    { name: "First Aid Station A", building: "Student Centre", location: "Ground floor lobby" },
    { name: "First Aid Station B", building: "Library", location: "Information desk area" },
    { name: "Medical Centre", building: "Medical Centre", location: "Main entrance" },
  ],
  emergencyProcedures: [
    "Call campus security: ext. 999 or 555-0199",
    "Go to the nearest Medical Centre (always step-free access)",
    "First Aid kits are at Student Centre lobby and Library information desk",
    "AED defibrillators are at Student Centre and Engineering Hall",
  ],
};

function generateChecklist(message: string): string[] {
  const lower = message.toLowerCase();
  if (lower.includes("stuck") || lower.includes("emergency") || lower.includes("help") || lower.includes("sos")) {
    return [
      "Stay calm and stay where you are",
      "Press the SOS button in the app bottom bar",
      "Call campus security: ext. 999",
      "Navigate to the nearest Medical Centre if safe to move",
      "Wait for assistance — your location has been shared with admins",
    ];
  }
  if (lower.includes("elevator") || lower.includes("lift")) {
    return [
      "Do not attempt to force the elevator doors",
      "Use the emergency call button inside the elevator",
      "Report the issue using the obstacle report feature",
      "Check the app for alternative accessible routes",
      "Contact campus facilities: ext. 200",
    ];
  }
  if (lower.includes("wet") || lower.includes("floor") || lower.includes("slippery")) {
    return [
      "Avoid the wet area — do not proceed",
      "Report using the Obstacle Report feature (Wet Floor)",
      "Take the alternative route shown on the map",
      "Alert a nearby staff member if possible",
    ];
  }
  return [];
}

function generateReply(message: string): string {
  const lower = message.toLowerCase();

  // Library queries
  if (lower.includes("library")) {
    if (lower.includes("access") || lower.includes("enter") || lower.includes("get to") || lower.includes("get in")) {
      return "The Library has two accessible entrances: the Main entrance (ramped), and the East entrance with automatic doors. Both are step-free. There are accessible restrooms on Floors 1, 2, and 3. The elevator is located near the main entrance on the ground floor.";
    }
    return "The Library is fully accessible. It has ramp access at the main entrance, automatic doors at the east entrance, elevators to all floors, and accessible restrooms on every floor. Quiet spaces are available on Floor 3, Room L-301 (open 9am–9pm daily).";
  }

  // Medical centre / emergency
  if (lower.includes("medical") || lower.includes("first aid") || lower.includes("emergency") || lower.includes("hurt") || lower.includes("injured")) {
    return "The Medical Centre is your nearest fully accessible emergency facility — it is step-free with automatic doors and accessible 24/7. First Aid stations are also located in the Student Centre ground floor lobby and at the Library information desk. For emergencies, call campus security at ext. 999 or use the SOS button in this app.";
  }

  // Restroom queries
  if (lower.includes("restroom") || lower.includes("bathroom") || lower.includes("toilet") || lower.includes("washroom")) {
    const building = lower.includes("library") ? "Library (Floors 1, 2, 3)"
      : lower.includes("science") ? "Science Block (Floors 1, 3)"
      : lower.includes("student") ? "Student Centre (Ground floor)"
      : lower.includes("medical") ? "Medical Centre (all floors)"
      : lower.includes("engineering") ? "Engineering Hall (Floors 1, 2)"
      : "the nearest building";
    return `Accessible restrooms in ${building} are available and fully wheelchair-accessible. Use the Navigate feature to find the step-free route to get there.`;
  }

  // Safe/quiet room
  if (lower.includes("quiet") || lower.includes("sensory") || lower.includes("calm") || lower.includes("safe room")) {
    return "PathAble has 3 sensory/quiet rooms on campus: Sensory Room 1 in the Student Centre (Room SC-201, Floor 2, open 8am–8pm weekdays), Quiet Space in the Library (Room L-301, Floor 3, open 9am–9pm daily), and the Wellbeing Room in the Medical Centre (Room MC-102, Floor 1, open 24/7). Tap 'Safe Rooms' on the home screen to check real-time availability and navigate there.";
  }

  // Elevator queries
  if (lower.includes("elevator") || lower.includes("lift")) {
    if (lower.includes("down") || lower.includes("broken") || lower.includes("working") || lower.includes("work")) {
      return "If an elevator is down, please report it using the Obstacle Report feature — select 'Elevator Down' as the issue type. I'll recalculate your route to avoid stairs. Buildings with elevators include: Library, Science Block, Engineering Hall, Student Centre, Block A, and Block B.";
    }
    return "Elevators are available in: Library (near main entrance), Science Block (north entrance), Engineering Hall, Student Centre, Medical Centre, Block A, and Block B. The Admin Building and Block C do not have elevators — accessible entrances are step-free on the ground floor.";
  }

  // Cafeteria
  if (lower.includes("cafeteria") || lower.includes("food") || lower.includes("eat") || lower.includes("dining")) {
    return "The Cafeteria has an automatic entrance door and is fully step-free. Accessible restrooms are on the ground floor. It's located near the Student Centre. Use the Navigate feature for a step-free route from your current location.";
  }

  // SOS / stuck
  if (lower.includes("stuck") || lower.includes("help") || lower.includes("can't move") || lower.includes("cannot move")) {
    return "Don't worry — help is on the way. Use the SOS button (red button in the bottom bar) to alert campus admin immediately. Your zone and disability profile will be included. You can also call campus security at ext. 999. Stay where you are and wait for assistance.";
  }

  // Crowd / busy
  if (lower.includes("crowd") || lower.includes("busy") || lower.includes("quiet route") || lower.includes("less people")) {
    return "The crowd density heatmap on the map screen shows predicted busyness by zone based on the class schedule. Green zones are clear, amber is moderate, red is busy. I'll suggest quieter routes when your planned path passes through a busy zone. Toggle the heatmap overlay using the layer button on the map.";
  }

  // Engineering
  if (lower.includes("engineering")) {
    return "Engineering Hall has a main entrance with a ramped access, elevators to all floors, and accessible restrooms on Floors 1 and 2. The lecture halls with step-free seating are on Floors 1 and 2.";
  }

  // Student Centre
  if (lower.includes("student centre") || lower.includes("student center")) {
    return "The Student Centre has automatic sliding doors at the main entrance, elevators, and accessible restrooms on the ground floor. It houses Sensory Room SC-201 on Floor 2, a First Aid station in the lobby, and an AED defibrillator. It's the most accessible hub on campus.";
  }

  // Sports
  if (lower.includes("sport") || lower.includes("gym") || lower.includes("pool")) {
    return "The Sports Complex has wide automatic entrance gates that are fully wheelchair accessible. Accessible changing rooms and restrooms are on the ground floor. Note: there is no elevator, but all accessible facilities are on the ground level.";
  }

  // Default
  return `I'm PathAble's campus assistant for Lakewood University. I can help with: finding accessible routes to any building, locating restrooms and elevators, finding sensory/quiet rooms, reporting obstacles, and emergency procedures. What would you like to know?`;
}

// POST /ai/chat
router.post("/chat", async (req, res) => {
  try {
    const schema = z.object({
      message: z.string().min(1),
      context: z.string().nullable().optional(),
    });
    const { message } = schema.parse(req.body);

    const reply = generateReply(message);
    const checklist = generateChecklist(message);

    res.json({ reply, checklist });
  } catch (err) {
    req.log.error({ err }, "Failed to process AI chat");
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to process AI chat" });
  }
});

export default router;
