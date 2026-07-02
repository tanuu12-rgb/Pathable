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

// A
const aSign = createGesture("A", [0], [], [1, 2, 3, 4]); // Thumb open, rest closed
aSign.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 0.5);
ASL_GESTURES.push(aSign);

// B
const bSign = createGesture("B", [1, 2, 3, 4], [], [0]); // Fingers up, thumb tucked
ASL_GESTURES.push(bSign);

// C
const cSign = createGesture("C", [], [0, 1, 2, 3, 4], []); // All half curl
ASL_GESTURES.push(cSign);

// D
const dSign = createGesture("D", [1], [], [0, 2, 3, 4]); // Index up
ASL_GESTURES.push(dSign);

// E
const eSign = createGesture("E", [], [], [0, 1, 2, 3, 4]); // All full curl
ASL_GESTURES.push(eSign);

// I Love You (ILY)
const ilySign = createGesture("I Love You", [0, 1, 4], [], [2, 3]);
ASL_GESTURES.push(ilySign);

// Peace / V
const vSign = createGesture("V", [1, 2], [], [0, 3, 4]); 
ASL_GESTURES.push(vSign);

// W
const wSign = createGesture("W", [1, 2, 3], [], [0, 4]);
ASL_GESTURES.push(wSign);

// F
const fSign = createGesture("F", [2, 3, 4], [], [0, 1]); // Index and thumb touching
ASL_GESTURES.push(fSign);

// L
const lSign = createGesture("L", [0, 1], [], [2, 3, 4]); // Thumb and index L shape
ASL_GESTURES.push(lSign);

// Y
const ySign = createGesture("Y", [0, 4], [], [1, 2, 3]); // Thumb and pinky out
ASL_GESTURES.push(ySign);

// Thumbs Up (Yes)
const yesSign = createGesture("Yes", [0], [], [1, 2, 3, 4]);
yesSign.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 1.0);
ASL_GESTURES.push(yesSign);
