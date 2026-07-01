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
  const [cooldown, setCooldown] = useState(false);

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
    // Basic heuristics for simple gestures using y-coordinates (assuming upright hand)
    // 8: Index, 12: Middle, 16: Ring, 20: Pinky, 4: Thumb
    // PIP joints: 6, 10, 14, 18. Thumb IP: 3
    
    const isFingerOpen = (tip: number, pip: number) => landmarks[tip][1] < landmarks[pip][1];
    
    const indexOpen = isFingerOpen(8, 6);
    const middleOpen = isFingerOpen(12, 10);
    const ringOpen = isFingerOpen(16, 14);
    const pinkyOpen = isFingerOpen(20, 18);
    
    // Thumbs up: thumb tip is higher than ring/pinky PIP, other fingers closed
    const thumbUp = landmarks[4][1] < landmarks[14][1] && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen;

    if (thumbUp) return "Yes";
    if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) return "Hello"; // Peace sign
    if (indexOpen && middleOpen && ringOpen && pinkyOpen) return "Stop or Help"; // Open hand
    
    return null;
  };

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
              setLastGesture(gestureText);
            }
          }
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [cooldown]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      runDetection();
    } catch {
      setError("Camera permission denied.");
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
    setTimeout(() => {
      setCooldown(false);
      setLastGesture("");
    }, 2000); // 2 second cooldown after sending
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

      <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-[4/3]">
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

      <div className="flex items-center gap-2">
         <div className="flex-1 bg-muted rounded-lg px-3 py-2 border border-border min-h-[40px] flex items-center">
            {lastGesture ? (
              <span className="text-sm font-bold text-primary">{lastGesture}</span>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                {isLoading ? "Waiting..." : "Make a gesture (Peace sign, Thumbs up, or Open hand)..."}
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
