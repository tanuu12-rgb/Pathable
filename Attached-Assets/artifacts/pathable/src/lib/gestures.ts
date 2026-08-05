import * as fp from "fingerpose";

// Helper to quickly define a gesture
function createGesture(
  name: string,
  noCurlFingers: Array<number>,
  halfCurlFingers: Array<number>,
  fullCurlFingers: Array<number>
) {
  const gesture = new fp.GestureDescription(name);
  noCurlFingers.forEach(f => gesture.addCurl(f, fp.FingerCurl.NoCurl, 1.0));
  halfCurlFingers.forEach(f => gesture.addCurl(f, fp.FingerCurl.HalfCurl, 1.0));
  fullCurlFingers.forEach(f => gesture.addCurl(f, fp.FingerCurl.FullCurl, 1.0));
  return gesture;
}

export const ASL_GESTURES: fp.GestureDescription[] = [];

// Thumbs up → "How do I get to the library?"
const thumbsUp = createGesture("How do I get to the library?", [0], [], [1, 2, 3, 4]);
thumbsUp.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 1.0);
ASL_GESTURES.push(thumbsUp);

// Thumbs down → "Is there an accessible restroom near Block B?"
const thumbsDown = createGesture("Is there an accessible restroom near Block B?", [0], [], [1, 2, 3, 4]);
thumbsDown.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalDown, 1.0);
ASL_GESTURES.push(thumbsDown);

// Open palm (all 5 fingers extended) → "What do I do if I get stuck?"
const openPalm = createGesture("What do I do if I get stuck?", [0, 1, 2, 3, 4], [], []);
ASL_GESTURES.push(openPalm);

// Index finger only → "Where is the nearest first aid kit?"
const indexPoint = createGesture("Where is the nearest first aid kit?", [1], [], [0, 2, 3, 4]);
ASL_GESTURES.push(indexPoint);

// Pinky and thumb extended → "Find me a quiet room"
const pinkyThumb = createGesture("Find me a quiet room", [0, 4], [], [1, 2, 3]);
ASL_GESTURES.push(pinkyThumb);

// Index and middle fingers extended (peace sign) → "Take me to the classroom"
const peaceSign = createGesture("Take me to the classroom", [1, 2], [], [0, 3, 4]);
ASL_GESTURES.push(peaceSign);

// Index, middle and ring fingers extended → "Where is the HOD cabin?"
const threeFingers = createGesture("Where is the HOD cabin?", [1, 2, 3], [], [0, 4]);
ASL_GESTURES.push(threeFingers);

// Four fingers extended (index, middle, ring, pinky), thumb closed → "Where is the washroom?"
const fourFingers = createGesture("Where is the washroom?", [1, 2, 3, 4], [], [0]);
ASL_GESTURES.push(fourFingers);

// --- ASL Alphabet (Non-conflicting/Basic) ---

// A
const letterA = createGesture("Letter A", [0], [], [1, 2, 3, 4]);
letterA.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 0.5);
ASL_GESTURES.push(letterA);

// B
const letterB = createGesture("Letter B", [1, 2, 3, 4], [], [0]);
ASL_GESTURES.push(letterB);

// C
const letterC = createGesture("Letter C", [], [0, 1, 2, 3, 4], []);
ASL_GESTURES.push(letterC);

// E
const letterE = createGesture("Letter E", [], [], [0, 1, 2, 3, 4]);
ASL_GESTURES.push(letterE);

// F
const letterF = createGesture("Letter F", [2, 3, 4], [], [0, 1]);
ASL_GESTURES.push(letterF);

// I
const letterI = createGesture("Letter I", [4], [], [0, 1, 2, 3]);
ASL_GESTURES.push(letterI);

// L
const letterL = createGesture("Letter L", [0, 1], [], [2, 3, 4]);
ASL_GESTURES.push(letterL);

// S (Fist)
const letterS = createGesture("Letter S", [], [], [0, 1, 2, 3, 4]); // Actually E is similar, but S has thumb over. Fingerpose is bad at this distinction, we'll map E instead and skip S to prevent conflict.
ASL_GESTURES.pop(); // Remove S

// X
const letterX = createGesture("Letter X", [], [1], [0, 2, 3, 4]);
ASL_GESTURES.push(letterX);
