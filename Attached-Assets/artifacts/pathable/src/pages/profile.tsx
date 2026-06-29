import { useState, useEffect, useRef } from "react";
import { useGetGamificationProfile, getGetGamificationProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Palette, Shield, Trophy, Calendar, Plus, Trash2, Heart, Bell } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const THEMES = [
  { id: "theme-standard", label: "Standard", preview: "bg-sky-500" },
  { id: "theme-high-contrast", label: "High Contrast", preview: "bg-black border-2 border-white" },
  { id: "theme-deuteranopia", label: "Deuteranopia", preview: "bg-blue-700" },
  { id: "theme-protanopia", label: "Protanopia", preview: "bg-blue-600" },
  { id: "theme-tritanopia", label: "Tritanopia", preview: "bg-rose-600" },
  { id: "theme-monochrome", label: "Monochrome", preview: "bg-gray-600" },
];

const MOOD_COLORS: Record<string, string> = {
  energetic: "#22c55e",
  moderate: "#3b82f6",
  low_energy: "#f59e0b",
  stressed: "#ef4444",
};

const MOOD_SCORES: Record<string, number> = {
  energetic: 4,
  moderate: 3,
  low_energy: 2,
  stressed: 1,
};

interface ClassEntry { id: string; subject: string; building: string; room: string; day: string; time: string; }

function getProfile() {
  try { return JSON.parse(localStorage.getItem("pathable-profile") || "{}"); } catch { return {}; }
}
function getSchedule(): ClassEntry[] {
  try { return JSON.parse(localStorage.getItem("pathable-schedule") || "[]"); } catch { return []; }
}
function getWellbeingHistory(): { mood: string; date: string }[] {
  try { return JSON.parse(localStorage.getItem("pathable-wellbeing-history") || "[]"); } catch { return []; }
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Simple confetti burst using a canvas element
function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = (canvas.width = canvas.offsetWidth);
  const H = (canvas.height = canvas.offsetHeight);
  const pieces = Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.5 - H * 0.5,
    r: 4 + Math.random() * 6,
    d: Math.random() * 3 + 1,
    color: ["#f59e0b","#3b82f6","#22c55e","#ef4444","#8b5cf6","#ec4899"][Math.floor(Math.random() * 6)],
    tilt: Math.random() * 10 - 10,
  }));
  let frame = 0;
  const c = ctx;
  function draw() {
    c.clearRect(0, 0, W, H);
    pieces.forEach((p) => {
      p.y += p.d;
      p.tilt += 0.1;
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      c.fillStyle = p.color ?? "#f59e0b";
      c.fill();
    });
    if (++frame < 90) requestAnimationFrame(draw);
    else c.clearRect(0, 0, W, H);
  }
  draw();
}

export default function Profile() {
  const { toast } = useToast();
  const [profile] = useState(getProfile());
  const [schedule, setSchedule] = useState<ClassEntry[]>(getSchedule);
  const [activeTab, setActiveTab] = useState<"profile" | "wellbeing" | "schedule" | "theme">("profile");
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem("pathable-theme") || "theme-standard");
  const [newClass, setNewClass] = useState({ subject: "", building: "", room: "", day: "Monday", time: "09:00" });
  const [notifEnabled, setNotifEnabled] = useState(localStorage.getItem("pathable-notifications") === "1");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevBadgeCount = useRef<number | null>(null);

  const { data: gamification } = useGetGamificationProfile(
    "demo-user",
    { query: { queryKey: getGetGamificationProfileQueryKey("demo-user") } }
  );

  // Confetti when a new badge is earned
  useEffect(() => {
    if (!gamification) return;
    const earned = gamification.badges.filter((b) => b.earned).length;
    if (prevBadgeCount.current !== null && earned > prevBadgeCount.current && canvasRef.current) {
      launchConfetti(canvasRef.current);
      toast({ title: "🎉 Badge Unlocked!", description: "You earned a new accessibility badge!" });
    }
    prevBadgeCount.current = earned;
  }, [gamification?.badges]);

  function applyTheme(theme: string) {
    setCurrentTheme(theme);
    localStorage.setItem("pathable-theme", theme);
    document.body.className = theme;
  }

  function addClass() {
    if (!newClass.subject || !newClass.building || !newClass.room) return;
    const entry: ClassEntry = { ...newClass, id: Date.now().toString() };
    const updated = [...schedule, entry];
    setSchedule(updated);
    localStorage.setItem("pathable-schedule", JSON.stringify(updated));
    setNewClass({ subject: "", building: "", room: "", day: "Monday", time: "09:00" });
    toast({ title: "Class added", description: `${entry.subject} added to your schedule` });

    // Schedule a push notification reminder (15 min before)
    if (notifEnabled && "Notification" in window && Notification.permission === "granted") {
      const [h, m] = entry.time.split(":").map(Number);
      const notifTime = new Date();
      notifTime.setHours(h, m - 15, 0, 0);
      const delay = notifTime.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          new Notification(`📚 Class in 15 minutes`, {
            body: `${entry.subject} — ${entry.building}, Room ${entry.room}`,
            icon: "/favicon.ico",
          });
        }, delay);
      }
    }
  }

  function removeClass(id: string) {
    const updated = schedule.filter((c) => c.id !== id);
    setSchedule(updated);
    localStorage.setItem("pathable-schedule", JSON.stringify(updated));
  }

  async function toggleNotifications() {
    if (!("Notification" in window)) {
      toast({ title: "Notifications not supported in this browser", variant: "destructive" });
      return;
    }
    if (!notifEnabled) {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setNotifEnabled(true);
        localStorage.setItem("pathable-notifications", "1");
        toast({ title: "🔔 Notifications enabled", description: "You'll get a 15-min reminder before each class." });
        new Notification("PathAble Notifications On", { body: "You'll receive class reminders 15 minutes before each session." });
      } else {
        toast({ title: "Permission denied", description: "Please allow notifications in your browser settings.", variant: "destructive" });
      }
    } else {
      setNotifEnabled(false);
      localStorage.setItem("pathable-notifications", "0");
      toast({ title: "Notifications disabled" });
    }
  }

  // Build weekly mood chart data from last 7 days
  const wellbeingHistory = getWellbeingHistory();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const entry = wellbeingHistory.find((h) => h.date === dateStr);
    return {
      day: d.toLocaleDateString("en-GB", { weekday: "short" }),
      score: entry ? MOOD_SCORES[entry.mood] ?? 0 : 0,
      mood: entry?.mood ?? null,
      color: entry ? (MOOD_COLORS[entry.mood] ?? "#d1d5db") : "#d1d5db",
    };
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "wellbeing", label: "Wellbeing", icon: Heart },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "theme", label: "Theme", icon: Palette },
  ] as const;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4 relative">
      {/* Confetti canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-50 rounded-xl"
        style={{ width: "100%", height: "100%" }}
      />

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
      </div>

      <div className="flex bg-muted rounded-xl p-1 mb-6 overflow-x-auto scrollbar-none gap-0.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap px-1 ${
              activeTab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={activeTab === id}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">{profile.name || "Guest User"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile.disabilityType?.replace("_", " ") || "Profile not set"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile.mobilityAid?.replace("_", " ")}</p>
                </div>
              </div>
              {!profile.name && (
                <Link href="/onboarding">
                  <Button className="w-full" variant="outline">Complete Profile Setup</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {gamification && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-foreground">Points & Activity</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Points", value: gamification.points },
                      { label: "Reports", value: gamification.reportsSubmitted },
                      { label: "Confirms", value: gamification.reportsConfirmed },
                      { label: "Routes", value: gamification.routesCompleted },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted rounded-lg py-2.5 px-1">
                        <p className="text-xl font-bold text-primary">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Badges</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
{Array.isArray(gamification?.badges) && gamification.badges.map((badge) => (                      <div
                        key={badge.id}
                        className={`rounded-xl p-3 border transition-all ${
                          badge.earned
                            ? "border-primary/30 bg-primary/10"
                            : "border-border bg-muted/50 opacity-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-semibold text-foreground">{badge.name}</p>
                          {badge.earned && <span className="text-green-500 text-xs">✓</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
                        {badge.earnedAt && (
                          <p className="text-[9px] text-muted-foreground mt-1">
                            {new Date(badge.earnedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === "wellbeing" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-rose-500" />
                <h3 className="font-semibold text-foreground">Weekly Mood Tracker</h3>
              </div>
              {wellbeingHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No check-ins yet</p>
                  <p className="text-xs mt-1">Check in daily on the Home screen</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={last7Days} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v, _name, props) => [props.payload.mood?.replace("_", " ") ?? "No data", "Mood"]}
                        labelFormatter={(l) => l}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {last7Days.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                      <div key={mood} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        {mood.replace("_", " ")}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {wellbeingHistory.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">Recent Check-Ins</h3>
                <div className="space-y-2">
                  {wellbeingHistory.slice(0, 7).map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{new Date(h.date).toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" })}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white capitalize"
                        style={{ background: MOOD_COLORS[h.mood] ?? "#9ca3af" }}
                      >
                        {h.mood.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Why check in?</span> Your mood is used to personalise
                routing — on stressed days, PathAble avoids crowded routes and shows sensory spaces nearby.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Class
                </h3>
                <button
                  onClick={toggleNotifications}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    notifEnabled
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                  aria-pressed={notifEnabled}
                >
                  <Bell className="h-3.5 w-3.5" />
                  {notifEnabled ? "Reminders On" : "Reminders Off"}
                </button>
              </div>
              <div className="space-y-3">
                <input
                  placeholder="Subject name"
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Building"
                    value={newClass.building}
                    onChange={(e) => setNewClass({ ...newClass, building: e.target.value })}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    placeholder="Room"
                    value={newClass.room}
                    onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newClass.day}
                    onChange={(e) => setNewClass({ ...newClass, day: e.target.value })}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input
                    type="time"
                    value={newClass.time}
                    onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button onClick={addClass} className="w-full" size="sm">Add to Schedule</Button>
              </div>
            </CardContent>
          </Card>

          {schedule.length > 0 ? (
            <div className="space-y-2">
              {schedule.map((cls) => (
                <Card key={cls.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{cls.subject}</p>
                      <p className="text-xs text-muted-foreground">{cls.building} — {cls.room}</p>
                      <p className="text-xs text-muted-foreground">{cls.day} at {cls.time}</p>
                    </div>
                    <button
                      onClick={() => removeClass(cls.id)}
                      aria-label={`Remove ${cls.subject}`}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">No classes added yet</p>
          )}
        </div>
      )}

      {activeTab === "theme" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose a colour scheme that works best for your visual needs.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTheme(t.id)}
                className={`rounded-xl p-4 border-2 flex flex-col items-center gap-3 transition-all ${
                  currentTheme === t.id ? "border-primary" : "border-border hover:border-primary/40"
                }`}
                aria-pressed={currentTheme === t.id}
              >
                <div className={`w-12 h-12 rounded-lg ${t.preview}`} />
                <span className="text-xs font-medium text-foreground">{t.label}</span>
                {currentTheme === t.id && (
                  <span className="text-[10px] text-primary font-semibold">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
