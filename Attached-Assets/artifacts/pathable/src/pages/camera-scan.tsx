import { useEffect, useRef, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { Camera, CameraOff, Bell, BellOff, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

type RiskLevel = "high" | "medium" | "low";

interface DetectionItem {
  cls: string;
  score: number;
  bbox: [number, number, number, number];
  risk: RiskLevel;
}

interface AlertEntry {
  cls: string;
  time: string;
  risk: RiskLevel;
}

const RISK_MAP: Record<string, RiskLevel> = {
  car: "high", truck: "high", motorcycle: "high", bicycle: "high", bus: "high",
  person: "medium",
  chair: "low", bench: "low", suitcase: "low", backpack: "low", bottle: "low",
  umbrella: "low", handbag: "low", "fire hydrant": "low", "stop sign": "low",
  "parking meter": "low", "traffic light": "low", cone: "high",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#3b82f6",
};

const RISK_BADGE: Record<RiskLevel, string> = {
  high: "bg-red-100 text-red-800 border border-red-200",
  medium: "bg-amber-100 text-amber-800 border border-amber-200",
  low: "bg-blue-100 text-blue-800 border border-blue-200",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "⚠️ High",
  medium: "⚡ Caution",
  low: "ℹ️ Low",
};

function getRisk(cls: string): RiskLevel | null {
  return RISK_MAP[cls] ?? null;
}

export default function CameraScan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastAlertRef = useRef<Record<string, number>>({});
  const notifRef = useRef(false);

  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [alertLog, setAlertLog] = useState<AlertEntry[]>([]);
  const [, navigate] = useLocation();

  // Keep ref in sync with state (avoid stale closure in rAF loop)
  useEffect(() => { notifRef.current = notificationsOn; }, [notificationsOn]);

  // Load TF + COCO-SSD model
  useEffect(() => {
    let cancelled = false;
    async function loadModel() {
      try {
        // Try WebGL (GPU), fall back to CPU if not available (e.g. sandboxed preview)
        try {
          await tf.setBackend("webgl");
        } catch {
          await tf.setBackend("cpu");
        }
        await tf.ready();
        const m = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (!cancelled) {
          modelRef.current = m;
          setModelLoading(false);
        }
      } catch {
        if (!cancelled) {
          setModelError("Could not load detection model. Check your connection and refresh.");
          setModelLoading(false);
        }
      }
    }
    loadModel();
    return () => {
      cancelled = true;
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const sendAlert = useCallback((cls: string, risk: RiskLevel) => {
    const now = Date.now();
    if (now - (lastAlertRef.current[cls] ?? 0) < 7000) return;
    lastAlertRef.current[cls] = now;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setAlertLog(prev => [{ cls, time, risk }, ...prev.slice(0, 14)]);

    if (notifRef.current && Notification.permission === "granted") {
      new Notification(`🚧 Obstacle: ${cls}`, {
        body: `${risk === "high" ? "High risk" : risk === "medium" ? "Caution" : "Low risk"} — ${cls} detected in your path.`,
        tag: `obstacle-${cls}`,
      });
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const message =
        risk === "high"
          ? `Warning! ${cls} detected. High risk obstacle blocking your path.`
          : risk === "medium"
          ? `Caution. ${cls} detected ahead. Please be careful.`
          : `Notice. ${cls} detected nearby.`;
      const u = new SpeechSynthesisUtterance(message);
      u.volume = 1.0;
      u.rate = risk === "high" ? 1.2 : 1.0;
      u.pitch = risk === "high" ? 1.2 : 1.0;
      window.speechSynthesis.speak(u);
    }
  }, []);

  const runDetection = useCallback(() => {
    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const model = modelRef.current;
      if (!video || !canvas || !model || video.readyState < 2) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const preds = await model.detect(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const found: DetectionItem[] = [];
      for (const p of preds) {
        const risk = getRisk(p.class);
        if (!risk || p.score < 0.45) continue;
        found.push({ cls: p.class, score: p.score, bbox: p.bbox as [number, number, number, number], risk });
        sendAlert(p.class, risk);

        const [x, y, w, h] = p.bbox;
        ctx.strokeStyle = RISK_COLORS[risk];
        ctx.lineWidth = 3;
        ctx.shadowColor = RISK_COLORS[risk];
        ctx.shadowBlur = 6;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;

        const label = `${p.class} ${Math.round(p.score * 100)}%`;
        ctx.font = "bold 13px system-ui";
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = RISK_COLORS[risk];
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, Math.max(0, y - 22), tw + 12, 22);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 6, Math.max(14, y - 5));
      }

      setDetections(found);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [sendAlert]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      runDetection();
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Could not access camera. Make sure no other app is using it."
      );
    }
  }, [runDetection]);

  const stopCamera = useCallback(() => {
    if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setCameraActive(false);
    setDetections([]);
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (!notificationsOn) {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        setNotificationsOn(perm === "granted");
        if (perm !== "granted") {
          alert("Notification permission denied. Enable it in browser settings.");
        }
      }
    } else {
      setNotificationsOn(false);
    }
  }, [notificationsOn]);

  const reportDetected = useCallback(() => {
    if (detections.length > 0) {
      const top = detections.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.risk] - order[b.risk];
      })[0];
      localStorage.setItem("pathable-camera-detected", JSON.stringify({ cls: top.cls, risk: top.risk }));
    }
    navigate("/report");
  }, [detections, navigate]);

  const highCount = detections.filter(d => d.risk === "high").length;
  const medCount = detections.filter(d => d.risk === "medium").length;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Camera Obstacle Scan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live AI detection of obstacles in your path
        </p>
      </div>

      {/* Camera viewport */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-video shadow-lg border border-border">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ display: cameraActive ? "block" : "none" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: cameraActive ? "block" : "none" }}
        />

        {/* Placeholder when camera is off */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
            {modelLoading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin" />
                <p className="text-sm font-medium">Loading AI model…</p>
                <p className="text-xs opacity-70">First load may take ~10 seconds</p>
              </>
            ) : modelError ? (
              <>
                <AlertTriangle className="h-10 w-10 text-red-400" />
                <p className="text-sm text-center px-6 text-red-300">{modelError}</p>
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
                </Button>
              </>
            ) : (
              <>
                <CameraOff className="h-12 w-12 opacity-40" />
                <p className="text-sm font-medium">Camera is off</p>
                <p className="text-xs opacity-60">Tap start to begin scanning</p>
              </>
            )}
          </div>
        )}

        {/* Scanning badge */}
        {cameraActive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white font-semibold">Scanning</span>
          </div>
        )}

        {/* Live count badge */}
        {cameraActive && detections.length > 0 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs text-white font-semibold">
              {detections.length} detected
            </span>
          </div>
        )}

        {/* High-risk alert overlay */}
        {cameraActive && highCount > 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-red-600/90 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-white flex-shrink-0 animate-pulse" />
            <span className="text-sm text-white font-bold">
              {highCount} high-risk obstacle{highCount !== 1 ? "s" : ""} in path!
            </span>
          </div>
        )}
        {cameraActive && highCount === 0 && medCount > 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-amber-500/90 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-white flex-shrink-0" />
            <span className="text-sm text-white font-semibold">
              {medCount} caution zone{medCount !== 1 ? "s" : ""} nearby
            </span>
          </div>
        )}
      </div>

      {/* Camera error */}
      {cameraError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {cameraError}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {!cameraActive ? (
          <Button
            className="flex-1"
            onClick={startCamera}
            disabled={modelLoading || !!modelError}
          >
            <Camera className="h-4 w-4 mr-2" />
            {modelLoading ? "Loading model…" : "Start Scanning"}
          </Button>
        ) : (
          <Button className="flex-1" variant="destructive" onClick={stopCamera}>
            <CameraOff className="h-4 w-4 mr-2" />
            Stop Camera
          </Button>
        )}
        <Button
          variant={notificationsOn ? "default" : "outline"}
          className={notificationsOn ? "bg-green-600 hover:bg-green-700" : ""}
          onClick={toggleNotifications}
          aria-label="Toggle notifications"
        >
          {notificationsOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs">
        {(["high", "medium", "low"] as RiskLevel[]).map(r => (
          <div key={r} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: RISK_COLORS[r] }} />
            <span className="text-muted-foreground">{RISK_LABEL[r]}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-auto">≥45% confidence</span>
      </div>

      {/* Live detections */}
      {cameraActive && detections.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Detected right now</p>
          <div className="flex flex-wrap gap-2">
            {detections.map((d, i) => (
              <div key={i} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${RISK_BADGE[d.risk]}`}>
                <span>{d.cls}</span>
                <span className="opacity-70">{Math.round(d.score * 100)}%</span>
              </div>
            ))}
          </div>
          <button
            onClick={reportDetected}
            className="mt-3 w-full text-xs font-semibold text-primary hover:text-primary/80 underline underline-offset-2 text-left transition-colors"
          >
            Report this obstacle →
          </button>
        </div>
      )}

      {/* Alert log */}
      {alertLog.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground mb-3">Detection log</p>
          <div className="space-y-2">
            {alertLog.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: RISK_COLORS[a.risk] }}
                  />
                  <span className="text-sm text-foreground capitalize">{a.cls}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${RISK_BADGE[a.risk]}`}>
                    {RISK_LABEL[a.risk]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground mb-1 text-sm">How it works</p>
        <p>🤖 AI model runs entirely on your device — no data is sent to any server.</p>
        <p>🔊 Voice alerts fire for high and medium risk obstacles (requires unmuted device).</p>
        <p>🔔 Enable notifications for background alerts even when the screen is locked.</p>
        <p>📸 Point camera at the path ahead to scan for obstacles before navigating.</p>
      </div>

      <Link href="/navigate">
        <Button variant="outline" className="w-full">
          ← Back to Map Navigation
        </Button>
      </Link>
    </div>
  );
}
