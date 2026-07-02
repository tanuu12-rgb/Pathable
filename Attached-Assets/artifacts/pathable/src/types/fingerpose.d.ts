declare module 'fingerpose' {
  export const Finger: Record<string, number>;
  export const FingerCurl: Record<string, number>;
  export const FingerDirection: Record<string, number>;

  export class GestureDescription {
    constructor(name: string);
    addCurl(finger: number, curl: number, confidence: number): void;
    addDirection(finger: number, direction: number, confidence: number): void;
  }

  export class GestureEstimator {
    constructor(gestures: GestureDescription[]);
    estimate(landmarks: any, minScore: number): { gestures: { name: string; score: number }[] };
  }
}
