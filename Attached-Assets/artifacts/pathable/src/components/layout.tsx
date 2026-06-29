import { useLocation, Link } from "wouter";
import { Home, MapPin, AlertTriangle, User, Siren } from "lucide-react";
import { useListCampusAlerts, useDismissCampusAlert, getListCampusAlertsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Volume2 } from "lucide-react";
import { useEffect, useRef } from "react";

function alertStyle(type: string) {
  if (type === "safety") return "bg-destructive text-destructive-foreground";
  if (type === "maintenance") return "bg-amber-500 text-white";
  return "bg-primary text-primary-foreground";
}

function alertIcon(type: string) {
  if (type === "safety") return "🚨";
  if (type === "maintenance") return "🔧";
  return "ℹ️";
}

function speakAlert(message: string) {
  const profile = (() => { try { return JSON.parse(localStorage.getItem("pathable-profile") || "{}"); } catch { return {}; } })();
  if (profile.navOutput === "voice" || profile.navOutput === "all") {
    window.speechSynthesis?.cancel();
    const utt = new SpeechSynthesisUtterance(message);
    utt.rate = 0.95;
    window.speechSynthesis?.speak(utt);
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const qc = useQueryClient();
  const announcedRef = useRef<Set<number>>(new Set());

  const { data: alerts } = useListCampusAlerts(
    { query: { queryKey: getListCampusAlertsQueryKey(), refetchInterval: 30000 } }
  );

  const dismissAlert = useDismissCampusAlert();

const activeAlerts = Array.isArray(alerts) ? alerts.filter((a) => a.status === "active") : [];  // Speak new alerts once
  useEffect(() => {
    activeAlerts.forEach((a) => {
      if (!announcedRef.current.has(a.id)) {
        announcedRef.current.add(a.id);
        speakAlert(a.message);
      }
    });
  }, [activeAlerts]);

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/navigate", icon: MapPin, label: "Navigate" },
    { path: "/report", icon: AlertTriangle, label: "Report" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-2 z-50 ${alertStyle(alert.alertType ?? "general")}`}
          role="alert"
          aria-live="assertive"
        >
          <span className="flex-1 flex items-center gap-2">
            <span className="text-base">{alertIcon(alert.alertType ?? "general")}</span>
            {alert.message}
          </span>
          <button
            aria-label="Dismiss alert"
            className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
            onClick={() =>
              dismissAlert.mutate(
                { id: alert.id },
                { onSuccess: () => qc.invalidateQueries({ queryKey: getListCampusAlertsQueryKey() }) }
              )
            }
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <main className="flex-1 pb-20 overflow-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-2 py-2 z-40 shadow-lg">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button
                aria-label={label}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[52px] ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px]">{label}</span>
              </button>
            </Link>
          );
        })}

        <Link href="/emergency">
          <button
            aria-label="SOS Emergency"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground font-bold shadow-md min-w-[52px] relative"
          >
            <span className="absolute inset-0 rounded-lg animate-ping bg-destructive opacity-40 pointer-events-none" />
            <Siren className="h-5 w-5 relative z-10" />
            <span className="text-[10px] font-bold relative z-10">SOS</span>
          </button>
        </Link>
      </nav>
    </div>
  );
}
