import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import { Camera, CameraOff, Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignLanguageInputProps {
  onTranslate: (text: string) => void;
  onClose: () => void;
}

export function SignLanguageInput({ onTranslate, onClose }: SignLanguageInputProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<handpose.HandPose | null>(null);
  const animRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastGesture, setLastGesture] = useState<string>("");
  const [detectingGesture, setDetectingGesture] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [confirmedPulse, setConfirmedPulse] = useState(false);
  
  const detectingRef = useRef<{ name: string | null; startTime: number }>({ name: null, startTime: 0 });

  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        await tf.ready();
        const model = await handpose.load();
        if (!cancelled) {
          modelRef.current = model;
          setIsLoading(false);
          startCamera();
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load hand tracking model.");
      }
    }
    loadModel();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  const detectGesture = (landmarks: number[][]) => {
    const wrist = landmarks[0];
    
    // Base and tip indices
    const thumbBase = landmarks[1], thumbTip = landmarks[4];
    const indexBase = landmarks[5], indexTip = landmarks[8];
    const middleBase = landmarks[9], middleTip = landmarks[12];
    const ringBase = landmarks[13], ringTip = landmarks[16];
    const pinkyBase = landmarks[17], pinkyTip = landmarks[20];

    const thumbExtended = Math.abs(thumbTip[0] - wrist[0]) > Math.abs(thumbBase[0] - wrist[0]);
    const indexExtended = indexTip[1] < indexBase[1];
    const middleExtended = middleTip[1] < middleBase[1];
    const ringExtended = ringTip[1] < ringBase[1];
    const pinkyExtended = pinkyTip[1] < pinkyBase[1];

    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      if (wrist[1] > middleBase[1]) return "How do I get to the library?"; // Thumbs up
      if (wrist[1] < middleBase[1]) return "Is there an accessible restroom near Block B?"; // Thumbs down
    }

    if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return "What do I do if I get stuck?"; // Open palm
    }

    if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return "Where is the nearest first aid kit?"; // Index only
    }

    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
      return "Find me a quiet room"; // Pinky and thumb
    }

    if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return "Take me to the classroom"; // Peace sign
    }

    if (!thumbExtended && indexExtended && middleExtended && ringExtended && !pinkyExtended) {
      return "Where is the HOD cabin?"; // Three fingers
    }

    if (!thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return "Where is the washroom?"; // Four fingers
    }

    return null;
  };

  const confirmGesture = useCallback((gestureText: string) => {
    setLastGesture(gestureText);
    setDetectingGesture(null);
    detectingRef.current = { name: null, startTime: 0 };
    
    setConfirmedPulse(true);
    setTimeout(() => setConfirmedPulse(false), 500);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(gestureText);
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        '1': "How do I get to the library?",
        '2': "Is there an accessible restroom near Block B?",
        '3': "What do I do if I get stuck?",
        '4': "Where is the nearest first aid kit?",
        '5': "Find me a quiet room",
        '6': "Take me to the classroom",
        '7': "Where is the HOD cabin?",
        '8': "Where is the washroom?"
      };
      if (map[e.key]) confirmGesture(map[e.key]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmGesture]);

  const runDetection = useCallback(() => {
    const tick = async () => {
      if (!videoRef.current || !canvasRef.current || !modelRef.current || cooldown) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      const hands = await modelRef.current.estimateHands(video);
      
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (hands.length > 0) {
          const hand = hands[0];
          // Draw landmarks
          ctx.fillStyle = "#3b82f6";
          for (let i = 0; i < hand.landmarks.length; i++) {
            const [x, y] = hand.landmarks[i];
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
          }

          if (!cooldown) {
            const gestureText = detectGesture(hand.landmarks as number[][]);
            if (gestureText) {
              const current = detectingRef.current;
              if (current.name === gestureText) {
                if (Date.now() - current.startTime >= 1500) {
                  confirmGesture(gestureText);
                }
              } else {
                detectingRef.current = { name: gestureText, startTime: Date.now() };
                setDetectingGesture(gestureText);
              }
            } else {
              if (detectingRef.current.name) {
                detectingRef.current = { name: null, startTime: 0 };
                setDetectingGesture(null);
              }
            }
          }
        } else {
          if (detectingRef.current.name) {
            detectingRef.current = { name: null, startTime: 0 };
            setDetectingGesture(null);
          }
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [cooldown, confirmGesture]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         throw new Error("getUserMedia not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      runDetection();
    } catch (e: any) {
      console.error("Camera access error:", e);
      setError(`Camera Error: ${e.message || e.toString() || "Permission denied."}`);
    }
  };

  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  const handleSend = () => {
    if (!lastGesture) return;
    onTranslate(lastGesture);
    setCooldown(true);
    setLastGesture("");
    setTimeout(() => {
      setCooldown(false);
    }, 2000); 
  };

  return (
    <div className="w-full bg-card border-x border-t border-border rounded-t-2xl p-4 flex flex-col gap-3 relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Sign Language Input</h3>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => {stopCamera(); onClose();}}>
          <StopCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className={`relative w-full rounded-xl overflow-hidden bg-black aspect-[4/3] transition-all duration-300 ${confirmedPulse ? 'ring-4 ring-green-500 scale-[0.98]' : ''}`}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover transform -scale-x-100" // Mirror for user camera
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full transform -scale-x-100" // Match mirror
        />

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-2 bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs font-medium">Loading AI Handpose...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-2 bg-black/80 p-4 text-center">
            <CameraOff className="h-8 w-8" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] text-muted-foreground p-2 bg-muted/30 rounded-lg">
        <div><strong className="text-foreground">1.</strong> 👍 Library</div>
        <div><strong className="text-foreground">2.</strong> 👎 Restroom</div>
        <div><strong className="text-foreground">3.</strong> 🖐️ Stuck</div>
        <div><strong className="text-foreground">4.</strong> ☝️ First Aid</div>
        <div><strong className="text-foreground">5.</strong> 🤙 Quiet Room</div>
        <div><strong className="text-foreground">6.</strong> ✌️ Classroom</div>
        <div><strong className="text-foreground">7.</strong> 🖖 HOD Cabin</div>
        <div><strong className="text-foreground">8.</strong> 🖐️(4) Washroom</div>
      </div>

      {/* Screen reader live region */}
      <div aria-live="assertive" className="sr-only">
        {lastGesture ? `Confirmed: ${lastGesture}` : detectingGesture ? `Detecting: ${detectingGesture}` : ''}
      </div>

      <div className="flex items-center gap-2">
         <div className="flex-1 bg-muted rounded-lg px-3 py-2 border border-border min-h-[40px] flex items-center">
            {lastGesture ? (
              <span className="text-sm font-bold text-green-600">{lastGesture}</span>
            ) : detectingGesture ? (
              <span className="text-sm font-medium text-amber-500 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Detecting: {detectingGesture}...
              </span>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                {isLoading ? "Waiting..." : "Hold gesture or press 1-8..."}
              </span>
            )}
         </div>
         <Button
           size="sm"
           disabled={!lastGesture || cooldown}
           onClick={handleSend}
           className="shrink-0"
         >
            Send Translation
         </Button>
      </div>
    </div>
  );
}
