export type GuidanceEventType = "turn" | "obstacle";
export type GuidanceSeverity = "routine" | "critical";

export interface GuidanceEvent {
  type: GuidanceEventType;
  severity: GuidanceSeverity;
  message: string;
}

type GuidanceListener = (event: GuidanceEvent) => void;

class GuidanceBus {
  private listeners: Set<GuidanceListener> = new Set();

  subscribe(fn: GuidanceListener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  publish(event: GuidanceEvent): void {
    this.listeners.forEach(fn => fn(event));
  }
}

export const guidanceBus = new GuidanceBus();
