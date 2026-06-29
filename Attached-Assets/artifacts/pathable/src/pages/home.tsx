import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, AlertTriangle, Shield, Siren, UserCircle, Trophy, Stethoscope, MessageCircle, Heart, Camera } from "lucide-react";
import { useGetAdminSummary, useListObstacles, getGetAdminSummaryQueryKey, getListObstaclesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import WellbeingModal from "@/components/wellbeing-modal";
import Tour from "@/components/tour";

const QUICK_ACTIONS = [
  { href: "/navigate", icon: MapPin, label: "Navigate", desc: "Find accessible routes", color: "bg-primary text-primary-foreground" },
  { href: "/camera-scan", icon: Camera, label: "Camera Scan", desc: "Detect obstacles live", color: "bg-cyan-600 text-white" },
  { href: "/report", icon: AlertTriangle, label: "Report Issue", desc: "Submit an obstacle alert", color: "bg-orange-500 text-white" },
  { href: "/safe-rooms", icon: Shield, label: "Safe Rooms", desc: "Find sensory spaces", color: "bg-secondary text-secondary-foreground" },
  { href: "/emergency", icon: Stethoscope, label: "First Aid", desc: "Emergency resources", color: "bg-red-600 text-white" },
  { href: "/assistant", icon: MessageCircle, label: "AI Assistant", desc: "Ask anything about campus", color: "bg-violet-600 text-white" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard", desc: "Top contributors", color: "bg-amber-500 text-white" },
];

type Mood = "energetic" | "moderate" | "low_energy" | "stressed";

const MOOD_BADGES: Record<Mood, { emoji: string; label: string; color: string }> = {
  energetic: { emoji: "⚡", label: "Energetic", color: "bg-green-100 text-green-800" },
  moderate:  { emoji: "🙂", label: "Moderate",  color: "bg-blue-100 text-blue-800" },
  low_energy: { emoji: "😴", label: "Low Energy", color: "bg-amber-100 text-amber-800" },
  stressed:  { emoji: "😟", label: "Stressed",  color: "bg-red-100 text-red-800" },
};

function getProfile() {
  try { return JSON.parse(localStorage.getItem("pathable-profile") || "{}"); } catch { return {}; }
}
function getTodayMood(): Mood | null {
  try {
    const stored = JSON.parse(localStorage.getItem("pathable-wellbeing-today") || "{}");
    const today = new Date().toISOString().split("T")[0];
    if (stored.date === today) return stored.mood as Mood;
  } catch {}
  return null;
}
function shouldShowTour() {
  return !localStorage.getItem("pathable-tour-done");
}

export default function Home() {
  const profile = getProfile();
  const firstName = profile.name?.split(" ")[0] || "there";

  const [showWellbeing, setShowWellbeing] = useState(false);
  const [todayMood, setTodayMood] = useState<Mood | null>(getTodayMood);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout> | null = null;
    if (!getTodayMood()) {
      tid = setTimeout(() => setShowWellbeing(true), 2000);
    } else if (shouldShowTour()) {
      tid = setTimeout(() => setShowTour(true), 500);
    }
    return () => { if (tid !== null) clearTimeout(tid); };
  }, []);

  const { data: summary } = useGetAdminSummary({
    query: { queryKey: getGetAdminSummaryQueryKey() },
  });
  const { data: obstacles } = useListObstacles(
    { active: true },
    { query: { queryKey: getListObstaclesQueryKey({ active: true }) } }
  );

  const activeObstacles = Array.isArray(obstacles) ? obstacles : [];
  function handleWellbeingClose(mood?: Mood) {
    setShowWellbeing(false);
    if (mood) setTodayMood(mood);
    if (shouldShowTour()) setTimeout(() => setShowTour(true), 300);
  }

  const routingSuggestion =
    todayMood === "stressed"
      ? "Quiet route mode is on — busy zones are avoided."
      : todayMood === "low_energy"
      ? "Rest-friendly routing is on — extra rest stops included."
      : null;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      {showTour && <Tour onComplete={() => setShowTour(false)} />}
      {showWellbeing && <WellbeingModal onClose={handleWellbeingClose} />}

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hi, {firstName} 👋</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Lakewood University — today's campus</p>
        </div>
        <button
          onClick={() => setShowWellbeing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
          aria-label="Open wellbeing check-in"
        >
          <Heart className="h-3.5 w-3.5" />
          {todayMood ? MOOD_BADGES[todayMood].emoji + " " + MOOD_BADGES[todayMood].label : "Check in"}
        </button>
      </div>

      {routingSuggestion && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-medium flex items-center gap-2">
          <span>💡</span> {routingSuggestion}
        </div>
      )}

      {activeObstacles.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {activeObstacles.length} active obstacle{activeObstacles.length !== 1 ? "s" : ""} on campus
          </p>
          <div className="mt-2 space-y-0.5">
            {activeObstacles.slice(0, 2).map((o) => (
              <p key={o.id} className="text-xs text-orange-700">
                <span className="font-medium">{o.zone}</span> — {o.issueType.replace(/_/g, " ")}
              </p>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { value: summary.activeIncidentsToday, label: "Incidents today", color: "text-primary" },
            { value: summary.sosEventsThisWeek, label: "SOS this week", color: "text-destructive" },
            { value: summary.totalActiveAlerts, label: "Campus alerts", color: "text-foreground" },
          ].map(({ value, label, color }) => (
            <Card key={label} className="text-center">
              <CardContent className="py-3 px-2">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map(({ href, icon: Icon, label, desc, color }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!profile.name && (
        <div className="mt-5 p-4 bg-primary/10 rounded-xl border border-primary/20">
          <p className="text-sm font-semibold text-primary">Set up your accessibility profile</p>
          <p className="text-xs text-muted-foreground mt-1">Get personalised routes and alerts tailored to your needs.</p>
          <Link href="/onboarding">
            <button className="mt-2 text-xs font-semibold text-primary underline underline-offset-2">
              Complete setup →
            </button>
          </Link>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Link href="/admin">
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <UserCircle className="h-3.5 w-3.5" /> Admin view
          </button>
        </Link>
      </div>
    </div>
  );
}
