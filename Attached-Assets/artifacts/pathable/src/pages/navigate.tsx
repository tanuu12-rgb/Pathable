import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import {
  useListObstacles,
  getListObstaclesQueryKey,
} from "@workspace/api-client-react";
import {
  MapPin, AlertTriangle, Shield, Layers, Navigation,
  Stethoscope, Camera, CameraOff, Loader2, Volume2, VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { guidanceBus, type GuidanceEvent } from "@/lib/guidance-bus";
import {
  shouldUseVoice, shouldUseVisual, shouldUseHaptic,
  shouldSimplifyCognitive, simplifyCognitive, isLargeTextProfile,
  classifyObstacle, buildObstacleMessage, riskColour,
  HAPTIC_ROUTINE, HAPTIC_CRITICAL,
  type UserProfile,
} from "@/lib/renderers";

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const CAMPUS_CENTER: [number, number] = [51.505, -0.09];

const CAMPUS_BUILDINGS = [
  { name: "Library",          lat: 51.5060, lng: -0.0910 },
  { name: "Science Block",    lat: 51.5065, lng: -0.0895 },
  { name: "Engineering Hall", lat: 51.5070, lng: -0.0880 },
  { name: "Student Centre",   lat: 51.5050, lng: -0.0900 },
  { name: "Admin Building",   lat: 51.5045, lng: -0.0925 },
  { name: "Medical Centre",   lat: 51.5040, lng: -0.0930 },
  { name: "Sports Complex",   lat: 51.5090, lng: -0.0870 },
  { name: "Cafeteria",        lat: 51.5045, lng: -0.0905 },
  { name: "Block A",          lat: 51.5070, lng: -0.0875 },
  { name: "Block B",          lat: 51.5080, lng: -0.0890 },
  { name: "Block C",          lat: 51.5055, lng: -0.0875 },
];

const SAFE_ZONES = [
  { name: "Library Rest Area",        lat: 51.5062, lng: -0.0907, desc: "Seating + water fountain near main entrance" },
  { name: "Science Garden Bench",     lat: 51.5068, lng: -0.0892, desc: "Sheltered outdoor bench, wheelchair accessible" },
  { name: "Student Centre Quiet Zone",lat: 51.5052, lng: -0.0897, desc: "Low-sensory waiting area, inside ground floor" },
  { name: "Admin Pathway Rest",       lat: 51.5047, lng: -0.0921, desc: "Covered bench near accessible ramp" },
  { name: "Cafeteria South Bench",    lat: 51.5043, lng: -0.0903, desc: "Outdoor bench with shade, near step-free exit" },
];

const FIRST_AID_LOCATIONS = [
  { name: "AED — Library Entrance",     lat: 51.5059, lng: -0.0912, desc: "Automated External Defibrillator + first aid kit. Available 24/7." },
  { name: "First Aid Room — Medical Centre", lat: 51.5038, lng: -0.0932, desc: "Fully staffed medical room. Mon–Fri 8am–6pm." },
  { name: "AED — Student Centre",       lat: 51.5048, lng: -0.0902, desc: "Wall-mounted AED inside main lobby." },
  { name: "First Aid Kit — Engineering Hall", lat: 51.5072, lng: -0.0878, desc: "First aid kit in reception. Staff trained." },
];

const CROWD_MAP: Record<number, Record<string, "low" | "medium" | "high">> = {
  9:  { "Science Block": "high", "Engineering Hall": "high", "Block A": "high", "Library": "medium" },
  10: { "Student Centre": "high", "Cafeteria": "medium", "Library": "high" },
  12: { "Cafeteria": "high", "Student Centre": "high", "Library": "medium" },
  13: { "Cafeteria": "high", "Library": "medium", "Block B": "medium" },
  14: { "Science Block": "high", "Engineering Hall": "medium", "Block C": "medium" },
  17: { "Sports Complex": "high", "Cafeteria": "medium", "Student Centre": "medium" },
};

const ROUTE_OPTIONS = [
  { id: "shortest",         label: "Shortest",         desc: "Quickest step-free path" },
  { id: "fewest_obstacles", label: "Fewest Obstacles",  desc: "Avoids reported issues" },
  { id: "rest_stops",       label: "Most Rest Stops",   desc: "Passes safe zone checkpoints" },
];

const TURN_INSTRUCTIONS = [
  "Start at Student Centre main entrance",
  "Head north on Central Path (paved, step-free)",
  "Turn left at the Library junction",
  "Continue past the Library Garden bench (rest stop)",
  "Turn right at Science Block path",
  "Arrive at destination — accessible entrance on left",
];

const DETECT_INTERVAL_MS = 400;

function getCrowd(name: string): "low" | "medium" | "high" {
  return CROWD_MAP[new Date().getHours()]?.[name] ?? "low";
}
function densityColor(d: "low" | "medium" | "high") {
  return d === "high" ? "#ef4444" : d === "medium" ? "#f59e0b" : "#22c55e";
}
function shieldIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.45);border:2px solid white">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    </div>`,
    iconAnchor: [14, 14], popupAnchor: [0, -18],
  });
}
function crossIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:#dc2626;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.45);border:2px solid white">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L12 22M2 12L22 12"/></svg>
    </div>`,
    iconAnchor: [14, 14], popupAnchor: [0, -18],
  });
}

function readProfile(): UserProfile {
  try { return JSON.parse(localStorage.getItem("pathable-profile") || "{}"); } catch { return {}; }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Navigate() {
  // Map refs
  const mapRef            = useRef<HTMLDivElement>(null);
  const leafletMapRef     = useRef<L.Map | null>(null);
  const obstacleGroupRef  = useRef<L.LayerGroup | null>(null);
  const safeZoneGroupRef  = useRef<L.LayerGroup | null>(null);
  const firstAidGroupRef  = useRef<L.LayerGroup | null>(null);

  // Camera / perception refs
  const videoRef          = useRef<HTMLVideoElement>(null);
  const camCanvasRef      = useRef<HTMLCanvasElement>(null);
  const modelRef          = useRef<cocoSsd.ObjectDetection | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const animRef           = useRef<number | null>(null);
  const lastDetectRef     = useRef(0);
  const detectingRef      = useRef(false);
  const lastAlertRef      = useRef<Record<string, number>>({});

  // Guidance refs
  const profileRef        = useRef<UserProfile>(readProfile());
  const currentTurnRef    = useRef<GuidanceEvent | null>(null);
  const obstacleClearRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashClearRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step-chain refs — avoid stale closures inside utterance.onend callbacks
  const navStepRef        = useRef(0);
  const voiceMutedRef     = useRef(false);
  const routeActiveRef    = useRef(false);
  // Reassigned each render so closures always use the latest version
  const speakStepRef      = useRef<(step: number) => void>(() => {});

  // Map state
  const [showObstacles,  setShowObstacles]  = useState(true);
  const [showHeatmap,    setShowHeatmap]    = useState(true);
  const [showSafeZones,  setShowSafeZones]  = useState(true);
  const [showFirstAid,   setShowFirstAid]   = useState(true);
  const [selectedRoute,  setSelectedRoute]  = useState("shortest");
  const [destination,    setDestination]    = useState("");
  const [routeActive,    setRouteActive]    = useState(false);
  const [navStep,        setNavStep]        = useState(0);

  // Camera state
  const [cameraMode,   setCameraMode]   = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [cameraError,  setCameraError]  = useState<string | null>(null);
  const [voiceMuted,   setVoiceMuted]   = useState(false);

  // Guidance output state
  const [activeBanner,  setActiveBanner]  = useState<GuidanceEvent | null>(null);
  const [criticalFlash, setCriticalFlash] = useState(false);

  const profile   = profileRef.current;
  const largeText = isLargeTextProfile(profile);

  // ── Step-chain: speak instruction → wait for onend → advance ─────────────
  // Reassigned every render — closures inside utterance.onend always call latest
  speakStepRef.current = (step: number) => {
    const rawMsg    = TURN_INSTRUCTIONS[step];
    const p         = profileRef.current;
    const isMuted   = voiceMutedRef.current;
    const isLast    = step === TURN_INSTRUCTIONS.length - 1;
    const displayMsg = shouldSimplifyCognitive(p) ? simplifyCognitive(rawMsg) : rawMsg;

    // Publish to GuidanceBus → fires VisualRenderer + HapticRenderer
    guidanceBus.publish({ type: "turn", severity: "routine", message: rawMsg });

    // ── Voice: speak directly so we can hook utterance.onend ──
    if (shouldUseVoice(p) && !isMuted && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(displayMsg);
      u.volume = 0.9;
      u.rate   = 1.0;

      if (!isLast) {
        u.onend = () => {
          // Speech finished → give user 3 s to act, then advance
          stepTimerRef.current = setTimeout(() => {
            if (!routeActiveRef.current) return;
            const next = navStepRef.current + 1;
            if (next < TURN_INSTRUCTIONS.length) {
              setNavStep(next);
              navStepRef.current = next;
              speakStepRef.current(next);
            }
          }, 3000);
        };
      }
      window.speechSynthesis.speak(u);
    } else if (!isLast) {
      // No voice (deaf profile or muted) → fixed 6 s timer per step
      stepTimerRef.current = setTimeout(() => {
        if (!routeActiveRef.current) return;
        const next = navStepRef.current + 1;
        if (next < TURN_INSTRUCTIONS.length) {
          setNavStep(next);
          navStepRef.current = next;
          speakStepRef.current(next);
        }
      }, 6000);
    }
  };

  // Manual "next step" skip — cancels pending timer, re-speaks immediately
  function manualAdvanceStep() {
    if (stepTimerRef.current !== null) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
    window.speechSynthesis.cancel();
    const next = navStepRef.current + 1;
    if (next < TURN_INSTRUCTIONS.length) {
      setNavStep(next);
      navStepRef.current = next;
      speakStepRef.current(next);
    }
  }

  function manualPrevStep() {
    if (stepTimerRef.current !== null) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
    window.speechSynthesis.cancel();
    const prev = Math.max(0, navStepRef.current - 1);
    setNavStep(prev);
    navStepRef.current = prev;
    speakStepRef.current(prev);
  }

  // ── GuidanceBus: subscribe and dispatch to renderers ─────────────────────
  useEffect(() => {
    const unsubscribe = guidanceBus.subscribe((event) => {
      const p = profileRef.current;
      const mutedNow = voiceMuted;
      const displayMsg = shouldSimplifyCognitive(p) ? simplifyCognitive(event.message) : event.message;
      const displayEvent: GuidanceEvent = { ...event, message: displayMsg };

      // VisualRenderer
      if (shouldUseVisual(p)) {
        if (event.type === "turn") {
          currentTurnRef.current = displayEvent;
          // Only show turn if no active obstacle banner
          if (!obstacleClearRef.current) setActiveBanner(displayEvent);
        } else {
          // Obstacle: show with priority, auto-clear after 6 s
          setActiveBanner(displayEvent);
          if (obstacleClearRef.current !== null) clearTimeout(obstacleClearRef.current);
          obstacleClearRef.current = setTimeout(() => {
            obstacleClearRef.current = null;
            setActiveBanner(currentTurnRef.current);
          }, 6000);
        }
      } else if (event.type === "turn") {
        // Keep turn ref in sync even if visual is off (for haptic/voice ordering)
        currentTurnRef.current = displayEvent;
      }

      // Critical flash (screen-level visual interrupt)
      if (event.severity === "critical") {
        setCriticalFlash(true);
        if (flashClearRef.current !== null) clearTimeout(flashClearRef.current);
        flashClearRef.current = setTimeout(() => setCriticalFlash(false), 600);
      }

      // VoiceRenderer — obstacle alerts only
      // Turn voice is handled by the step-chain (speakStepRef) so onend can trigger next step
      if (event.type === "obstacle" && shouldUseVoice(p) && !mutedNow) {
        // Critical obstacles always interrupt any in-progress turn speech
        window.speechSynthesis.cancel();
        // Also cancel the pending step timer so obstacle speech isn't cut short
        if (event.severity === "critical" && stepTimerRef.current !== null) {
          clearTimeout(stepTimerRef.current);
          stepTimerRef.current = null;
        }
        const u = new SpeechSynthesisUtterance(displayMsg);
        u.volume = event.severity === "critical" ? 1.0 : 0.85;
        u.rate   = event.severity === "critical" ? 1.2 : 1.0;
        u.pitch  = event.severity === "critical" ? 1.3 : 1.0;
        // After obstacle speech ends, resume current step chain
        u.onend = () => {
          if (routeActiveRef.current && event.severity === "critical") {
            stepTimerRef.current = setTimeout(() => {
              speakStepRef.current(navStepRef.current);
            }, 2000);
          }
        };
        window.speechSynthesis.speak(u);
      }

      // HapticRenderer
      if (shouldUseHaptic(p)) {
        navigator.vibrate?.(event.severity === "critical" ? HAPTIC_CRITICAL : HAPTIC_ROUTINE);
      }
    });
    return unsubscribe;
  }, [voiceMuted]);

  // ── Map init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
    leafletMapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    map.setView(CAMPUS_CENTER, 16);
    CAMPUS_BUILDINGS.forEach((b) => {
      const density = getCrowd(b.name);
      L.circle([b.lat, b.lng], {
        color: densityColor(density), fillColor: densityColor(density),
        fillOpacity: 0.12, radius: 40, weight: 2,
      }).addTo(map);
      L.marker([b.lat, b.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#1e3a5f;color:white;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,.35)">${b.name}</div>`,
          iconAnchor: [0, 0],
        }),
      }).addTo(map);
    });
    return () => { map.remove(); leafletMapRef.current = null; };
  }, []);

  // Invalidate map size when camera mode toggles (PiP ↔ full-screen)
  useEffect(() => {
    let tid: ReturnType<typeof setTimeout> | null = null;
    if (leafletMapRef.current) {
      tid = setTimeout(() => leafletMapRef.current?.invalidateSize(), 320);
    }
    return () => { if (tid !== null) clearTimeout(tid); };
  }, [cameraMode]);

  // ── Safe zone pins ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (safeZoneGroupRef.current) { map.removeLayer(safeZoneGroupRef.current); safeZoneGroupRef.current = null; }
    if (!showSafeZones) return;
    const g = L.layerGroup();
    SAFE_ZONES.forEach(z => L.marker([z.lat, z.lng], { icon: shieldIcon() })
      .bindPopup(`<b>🛡️ ${z.name}</b><br><span style="font-size:12px">${z.desc}</span>`).addTo(g));
    g.addTo(map);
    safeZoneGroupRef.current = g;
  }, [showSafeZones]);

  // ── First aid pins ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (firstAidGroupRef.current) { map.removeLayer(firstAidGroupRef.current); firstAidGroupRef.current = null; }
    if (!showFirstAid) return;
    const g = L.layerGroup();
    FIRST_AID_LOCATIONS.forEach(f => L.marker([f.lat, f.lng], { icon: crossIcon() })
      .bindPopup(`<b>➕ ${f.name}</b><br><span style="font-size:12px">${f.desc}</span>`).addTo(g));
    g.addTo(map);
    firstAidGroupRef.current = g;
  }, [showFirstAid]);

  // ── Obstacle overlay from DB ──────────────────────────────────────────────
  const { data: obstacles } = useListObstacles(
    { active: true },
    { query: { queryKey: getListObstaclesQueryKey({ active: true }) } }
  );
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (obstacleGroupRef.current) { map.removeLayer(obstacleGroupRef.current); obstacleGroupRef.current = null; }
    if (!showObstacles || !Array.isArray(obstacles) || obstacles.length === 0) return;
const g = L.layerGroup();
obstacles.forEach(o => {
      if (!o.lat || !o.lng) return;
      L.circle([o.lat as number, o.lng as number], {
        color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.5, radius: 25, weight: 2,
      }).bindPopup(`<b>${o.issueType.replace(/_/g, " ")}</b><br>${o.zone}<br>${o.description}`).addTo(g);
    });
    g.addTo(map);
    obstacleGroupRef.current = g;
  }, [obstacles, showObstacles]);

  // ── Turn step chain: starts on routeActive, driven by speech completion ────
  useEffect(() => {
    if (!routeActive) {
      routeActiveRef.current = false;
      if (stepTimerRef.current !== null) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
      window.speechSynthesis.cancel();
      return;
    }
    routeActiveRef.current = true;
    navStepRef.current = 0;
    setNavStep(0);
    // Kick off the chain — each step speaks, waits for onend, then advances
    speakStepRef.current(0);

    return () => {
      routeActiveRef.current = false;
      if (stepTimerRef.current !== null) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
      window.speechSynthesis.cancel();
    };
  }, [routeActive]);

  // ── Clean up timers on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (obstacleClearRef.current !== null) clearTimeout(obstacleClearRef.current);
      if (flashClearRef.current !== null) clearTimeout(flashClearRef.current);
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();
    };
  }, []);

  // ── Perception engine: obstacle detection ─────────────────────────────────
  function startDetectionLoop() {
    const tick = async (timestamp: number) => {
      const video  = videoRef.current;
      const canvas = camCanvasRef.current;
      const model  = modelRef.current;

      if (video && canvas && model && !detectingRef.current && video.readyState >= 2) {
        if (timestamp - lastDetectRef.current >= DETECT_INTERVAL_MS) {
          lastDetectRef.current  = timestamp;
          detectingRef.current   = true;

          canvas.width  = video.videoWidth  || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext("2d");

          try {
            const preds = await model.detect(video);
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of preds) {
              const risk = classifyObstacle(p.class, p.score);
              if (!risk) continue;

              // Throttle per-class alerts (7 s)
              const now = Date.now();
              if (now - (lastAlertRef.current[p.class] ?? 0) < 7000) {
                // Still draw box even if throttled
              } else {
                lastAlertRef.current[p.class] = now;
                guidanceBus.publish({
                  type:     "obstacle",
                  severity: risk === "critical" ? "critical" : "routine",
                  message:  buildObstacleMessage(p.class, risk),
                });
              }

              // Draw bounding box
              if (ctx) {
                const [x, y, w, h] = p.bbox;
                const colour = riskColour(risk);
                ctx.strokeStyle = colour;
                ctx.lineWidth = 3;
                ctx.shadowColor = colour;
                ctx.shadowBlur = 6;
                ctx.strokeRect(x, y, w, h);
                ctx.shadowBlur = 0;

                const label = `${p.class} ${Math.round(p.score * 100)}%`;
                ctx.font = "bold 13px system-ui";
                const tw = ctx.measureText(label).width;
                ctx.fillStyle = colour;
                ctx.globalAlpha = 0.88;
                ctx.fillRect(x, Math.max(0, y - 22), tw + 12, 22);
                ctx.globalAlpha = 1;
                ctx.fillStyle = "#fff";
                ctx.fillText(label, x + 6, Math.max(14, y - 5));
              }
            }
          } finally {
            detectingRef.current = false;
          }
        }
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }

  // ── Camera mode toggle ────────────────────────────────────────────────────
  async function handleToggleCamera() {
    if (cameraMode) {
      // Stop
      if (animRef.current !== null) { cancelAnimationFrame(animRef.current); animRef.current = null; }
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      if (camCanvasRef.current) {
        const ctx = camCanvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, camCanvasRef.current.width, camCanvasRef.current.height);
      }
      setCameraMode(false);
      setCameraError(null);
      return;
    }

    // Start: load model if needed
    setCameraError(null);
    setModelLoading(true);
    try {
      if (!modelRef.current) {
        try { await tf.setBackend("webgl"); } catch { await tf.setBackend("cpu"); }
        await tf.ready();
        modelRef.current = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      }
    } catch {
      setModelLoading(false);
      setCameraError("Could not load detection model. Try refreshing.");
      return;
    }
    setModelLoading(false);

    // Start camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraMode(true);
      startDetectionLoop();
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : "Could not access camera.",
      );
    }
  }

  // ── Derived profile values ────────────────────────────────────────────────
  const wellbeingToday = (() => {
    try {
      const s = JSON.parse(localStorage.getItem("pathable-wellbeing-today") || "{}");
      const today = new Date().toISOString().split("T")[0];
      if (s.date === today) return s.mood as string;
    } catch {}
    return null;
  })();
  const quietModeActive = wellbeingToday === "stressed" || wellbeingToday === "low_energy";
  const crowdWarning    = destination && profile.disabilityType === "cognitive" && getCrowd(destination) === "high";

  // Profile indicator chip
  const profileChip = (() => {
    const d = profile.disabilityType;
    if (!d) return null;
    if (d === "visual")    return { label: "Voice + Haptic active",   color: "bg-violet-100 text-violet-800" };
    if (d === "hearing")   return { label: "Visual + Haptic active",  color: "bg-blue-100 text-blue-800" };
    if (d === "cognitive") return { label: "Simplified guidance on",  color: "bg-amber-100 text-amber-800" };
    if (d === "combination") return { label: "All renderers active",  color: "bg-green-100 text-green-800" };
    return null;
  })();

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">

      {/* ── Controls ── */}
      <div className={`shrink-0 px-4 pt-3 pb-2 border-b z-10 relative ${cameraMode ? "bg-card/90 backdrop-blur-md" : "bg-card"}`}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-foreground">Navigate Campus</h1>
          <div className="flex items-center gap-2">
            {/* Mute voice toggle */}
            <button
              onClick={() => {
                const next = !voiceMuted;
                setVoiceMuted(next);
                voiceMutedRef.current = next;
                window.speechSynthesis.cancel();
                // If muting mid-navigation, the onend chain breaks — restart with timer fallback
                if (next && routeActiveRef.current) {
                  if (stepTimerRef.current !== null) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
                  stepTimerRef.current = setTimeout(() => {
                    if (!routeActiveRef.current) return;
                    speakStepRef.current(navStepRef.current + 1 < TURN_INSTRUCTIONS.length ? navStepRef.current + 1 : navStepRef.current);
                  }, 5000);
                }
                // If unmuting mid-navigation, cancel timer and re-speak current step
                if (!next && routeActiveRef.current) {
                  if (stepTimerRef.current !== null) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
                  speakStepRef.current(navStepRef.current);
                }
              }}
              className={`p-1.5 rounded-full transition-colors ${voiceMuted ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              aria-label="Toggle voice"
              title={voiceMuted ? "Voice muted" : "Voice on"}
            >
              {voiceMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {/* Camera toggle */}
            <button
              onClick={handleToggleCamera}
              disabled={modelLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                cameraMode
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-muted text-muted-foreground border-border hover:border-cyan-400"
              }`}
              aria-label="Toggle camera obstacle detection"
            >
              {modelLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : cameraMode ? (
                <CameraOff className="h-3.5 w-3.5" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {modelLoading ? "Loading…" : cameraMode ? "Camera On" : "Camera"}
            </button>
          </div>
        </div>

        {profileChip && (
          <div className={`mb-2 text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${profileChip.color}`}>
            <span>🎯</span> {profileChip.label}
          </div>
        )}

        {quietModeActive && (
          <div className="mb-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium flex items-center gap-1.5">
            <span>{wellbeingToday === "stressed" ? "🤫" : "😴"}</span>
            {wellbeingToday === "stressed" ? "Quiet route mode — busy zones avoided" : "Rest-stop routing — extra benches included"}
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <select
            value={destination}
            onChange={(e) => { setDestination(e.target.value); setRouteActive(false); setActiveBanner(null); currentTurnRef.current = null; }}
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Select destination"
          >
            <option value="">Select destination...</option>
            {CAMPUS_BUILDINGS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <Button
            onClick={() => { setRouteActive(true); }}
            disabled={!destination}
            size="sm"
            className="gap-1 shrink-0"
            aria-label="Start navigation"
          >
            <Navigation className="h-4 w-4" /> Go
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { icon: AlertTriangle, label: "Obstacles",  active: showObstacles,  toggle: () => setShowObstacles(!showObstacles) },
            { icon: Layers,        label: "Crowd Map",  active: showHeatmap,    toggle: () => setShowHeatmap(!showHeatmap) },
            { icon: Shield,        label: "Safe Zones", active: showSafeZones,  toggle: () => setShowSafeZones(!showSafeZones),  color: "text-blue-600 border-blue-300 bg-blue-50" },
            { icon: Stethoscope,   label: "First Aid",  active: showFirstAid,   toggle: () => setShowFirstAid(!showFirstAid),   color: "text-red-600 border-red-300 bg-red-50" },
          ].map(({ icon: Icon, label, active, toggle, color }) => (
            <button
              key={label}
              onClick={toggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 border transition-all ${
                active ? (color ?? "bg-primary/10 border-primary/30 text-primary") : "bg-muted border-border text-muted-foreground"
              }`}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {crowdWarning && (
          <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            This area is currently busy — consider a quieter time.
          </div>
        )}

        {cameraError && (
          <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {cameraError}
          </div>
        )}
      </div>

      {/* ── Main content: map + camera ── */}
      <div className="flex-1 relative min-h-0">

        {/* Camera background */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className={`absolute inset-0 w-full h-full object-cover ${cameraMode ? "" : "hidden"}`}
        />
        <canvas
          ref={camCanvasRef}
          className={`absolute inset-0 w-full h-full z-[5] pointer-events-none ${cameraMode ? "" : "hidden"}`}
        />

        {/* Critical flash overlay */}
        {criticalFlash && (
          <div className="absolute inset-0 z-[8] pointer-events-none bg-red-500/30" />
        )}

        {/* Map — full screen or PiP */}
        <div
          ref={mapRef}
          className={
            cameraMode
              ? "absolute bottom-[72px] right-3 w-40 h-32 rounded-xl border-2 border-white shadow-2xl z-20 overflow-hidden"
              : "absolute inset-0"
          }
        />

        {/* Legend (map-first mode only) */}
        {!cameraMode && (
          <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm rounded-xl p-2.5 shadow-lg z-[1000] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Clear</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /> Moderate</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /> Busy</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600" /> Safe Zone</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-700" /> First Aid</div>
          </div>
        )}

        {/* Camera scanning badge */}
        {cameraMode && !modelLoading && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white font-semibold">Scanning</span>
          </div>
        )}

        {/* Camera model loading overlay */}
        {cameraMode && modelLoading && (
          <div className="absolute inset-0 bg-black/75 z-30 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-sm font-medium">Loading AI model…</p>
            <p className="text-xs opacity-60">First load may take ~10 seconds</p>
          </div>
        )}

        {/* ── Guidance banner (obstacle + turn, fused) ── */}
        {activeBanner && (
          <div
            role="alert"
            aria-live="assertive"
            className={`absolute bottom-0 left-0 right-0 z-40 px-4 py-3 transition-colors ${
              activeBanner.severity === "critical"
                ? "bg-red-600"
                : activeBanner.type === "obstacle"
                ? "bg-amber-500"
                : cameraMode
                ? "bg-black/70 backdrop-blur-md"
                : "bg-card/95 backdrop-blur-md border-t border-border"
            }`}
          >
            <div className="flex items-start gap-3 max-w-lg mx-auto">
              {activeBanner.type === "obstacle" ? (
                <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 text-white ${activeBanner.severity === "critical" ? "animate-pulse" : ""}`} />
              ) : (
                <Navigation className={`h-5 w-5 shrink-0 mt-0.5 ${cameraMode ? "text-white" : "text-primary"}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-bold leading-tight ${
                  largeText ? "text-xl" : "text-sm"
                } ${activeBanner.type === "obstacle" || cameraMode ? "text-white" : "text-foreground"}`}>
                  {activeBanner.type === "obstacle"
                    ? (activeBanner.severity === "critical" ? "🚨 Critical Obstacle" : "⚠️ Obstacle Detected")
                    : `Step ${navStep + 1} of ${TURN_INSTRUCTIONS.length}`}
                </p>
                <p className={`mt-0.5 leading-snug ${
                  largeText ? "text-lg font-semibold" : "text-sm"
                } ${activeBanner.type === "obstacle" || cameraMode ? "text-white/90" : "text-muted-foreground"}`}>
                  {activeBanner.message}
                </p>
              </div>
              {/* Prev / Next step controls — only on turn banners */}
              {activeBanner.type === "turn" && routeActive && (
                <div className="flex flex-col gap-1 shrink-0 ml-1">
                  <button
                    onClick={manualPrevStep}
                    disabled={navStep === 0}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors disabled:opacity-30 ${
                      cameraMode ? "bg-white/20 text-white hover:bg-white/30" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="Previous step"
                  >
                    ‹ Prev
                  </button>
                  <button
                    onClick={manualAdvanceStep}
                    disabled={navStep >= TURN_INSTRUCTIONS.length - 1}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors disabled:opacity-30 ${
                      cameraMode ? "bg-white/20 text-white hover:bg-white/30" : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    aria-label="Next step"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Route panel (map mode, destination selected) ── */}
      {!cameraMode && destination && (
        <div className="border-t border-border bg-card px-4 py-3 shrink-0 max-h-48 overflow-y-auto">
          {!routeActive ? (
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Route options to {destination}</p>
              <div className="flex gap-2">
                {ROUTE_OPTIONS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoute(r.id)}
                    className={`flex-1 text-xs p-2 rounded-lg border-2 transition-all ${
                      selectedRoute === r.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                    aria-pressed={selectedRoute === r.id}
                  >
                    <p className="font-semibold">{r.label}</p>
                    <p className="opacity-70 text-[10px] mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  Navigating to {destination}
                  <span className="text-xs text-muted-foreground font-normal">
                    — Step {navStep + 1}/{TURN_INSTRUCTIONS.length}
                  </span>
                </p>
                <button
                  onClick={() => { setRouteActive(false); setActiveBanner(null); currentTurnRef.current = null; }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              <ol className="space-y-1.5">
                {TURN_INSTRUCTIONS.map((step, i) => (
                  <li
                    key={i}
                    onClick={() => {
                      if (stepTimerRef.current !== null) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
                      window.speechSynthesis.cancel();
                      setNavStep(i);
                      navStepRef.current = i;
                      speakStepRef.current(i);
                    }}
                    className={`flex items-start gap-2 text-xs transition-opacity cursor-pointer rounded-lg px-1 py-0.5 hover:bg-muted/60 ${i < navStep ? "opacity-40" : i === navStep ? "opacity-100" : "opacity-60"}`}
                    title={`Jump to step ${i + 1}`}
                  >
                    <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                      i === navStep ? "bg-primary text-primary-foreground" : i < navStep ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {i < navStep ? "✓" : i + 1}
                    </span>
                    <span className={`leading-relaxed ${i === navStep ? "font-semibold text-foreground" : i < navStep ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* In camera mode, show step progress at bottom instead of full route list */}
      {cameraMode && routeActive && !activeBanner && (
        <div className="shrink-0 px-4 py-2 bg-card/90 backdrop-blur-md border-t border-border flex items-center gap-3">
          <Navigation className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-foreground font-medium flex-1 truncate">{TURN_INSTRUCTIONS[navStep]}</p>
          <button
            onClick={() => { setRouteActive(false); setActiveBanner(null); }}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
