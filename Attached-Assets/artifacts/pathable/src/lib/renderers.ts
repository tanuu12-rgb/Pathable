export interface UserProfile {
  name?: string;
  disabilityType?: string;
  mobilityAid?: string;
  navOutput?: string;
}

// ── Channel activation ────────────────────────────────────────────────────────

export function shouldUseVoice(p: UserProfile): boolean {
  if (p.disabilityType === "hearing") return false; // deaf — voice is useless
  if (p.disabilityType === "visual")  return true;  // blind — voice is primary
  if (p.disabilityType === "cognitive") return true;
  return p.navOutput === "voice" || p.navOutput === "all" || !p.navOutput;
}

export function shouldUseVisual(p: UserProfile): boolean {
  if (p.disabilityType === "visual") return false; // blind — screen not primary
  return p.navOutput === "visual" || p.navOutput === "all" || !p.navOutput;
}

export function shouldUseHaptic(p: UserProfile): boolean {
  return (
    p.disabilityType === "visual" ||
    p.disabilityType === "hearing" ||
    p.disabilityType === "combination" ||
    p.navOutput === "all"
  );
}

export function shouldSimplifyCognitive(p: UserProfile): boolean {
  return p.disabilityType === "cognitive";
}

/** Visual font scale — hearing-impaired users rely purely on the visual channel */
export function isLargeTextProfile(p: UserProfile): boolean {
  return p.disabilityType === "hearing";
}

// ── Cognitive simplification (rule-based, no API) ────────────────────────────

export function simplifyCognitive(message: string): string {
  if (/turn left/i.test(message))                       return "Turn LEFT now";
  if (/turn right/i.test(message))                      return "Turn RIGHT now";
  if (/continue|head north|head south|straight/i.test(message)) return "Keep going straight";
  if (/rest stop|bench|garden/i.test(message))          return "Rest stop ahead";
  if (/arrive|destination/i.test(message))              return "You have arrived!";
  if (/start/i.test(message))                           return "Begin walking now";
  const clause = message.match(/^([^,—(]+)/);
  return clause ? clause[1].trim() : message;
}

// ── Obstacle severity classification (rule-based) ────────────────────────────

const CRITICAL_CLASSES = new Set(["car", "truck", "bus", "motorcycle", "bicycle"]);
const OBSTACLE_CLASSES = new Set([
  "car", "truck", "bus", "motorcycle", "bicycle",
  "person",
  "chair", "bench", "suitcase", "backpack", "bottle",
  "umbrella", "handbag", "fire hydrant", "stop sign", "traffic light",
]);

export type ObstacleRisk = "critical" | "routine";

export function classifyObstacle(cls: string, score: number): ObstacleRisk | null {
  if (score < 0.45) return null;
  if (!OBSTACLE_CLASSES.has(cls)) return null;
  if (CRITICAL_CLASSES.has(cls)) return "critical";
  if (cls === "person") return score >= 0.70 ? "critical" : "routine";
  return "routine";
}

export function buildObstacleMessage(cls: string, risk: ObstacleRisk): string {
  return risk === "critical"
    ? `Warning! ${cls} blocking your path.`
    : `${cls} detected nearby — proceed with caution.`;
}

// ── Haptic patterns ───────────────────────────────────────────────────────────

export const HAPTIC_ROUTINE: number[] = [100];
export const HAPTIC_CRITICAL: number[] = [200, 100, 200, 100, 300];

// ── Risk colour for canvas bounding boxes ────────────────────────────────────

export function riskColour(risk: ObstacleRisk): string {
  return risk === "critical" ? "#ef4444" : "#f59e0b";
}
