import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mood = "energetic" | "moderate" | "low_energy" | "stressed";

const MOODS: { id: Mood; label: string; emoji: string; desc: string; color: string }[] = [
  { id: "energetic", label: "Energetic", emoji: "⚡", desc: "Feeling great, ready to go", color: "border-green-400 bg-green-50 text-green-800" },
  { id: "moderate", label: "Moderate", emoji: "🙂", desc: "Doing okay", color: "border-blue-400 bg-blue-50 text-blue-800" },
  { id: "low_energy", label: "Low Energy", emoji: "😴", desc: "Taking it slow today", color: "border-amber-400 bg-amber-50 text-amber-800" },
  { id: "stressed", label: "Stressed", emoji: "😟", desc: "Feeling overwhelmed", color: "border-red-400 bg-red-50 text-red-800" },
];

interface Props {
  onClose: (mood?: Mood) => void;
}

export default function WellbeingModal({ onClose }: Props) {
  const [selected, setSelected] = useState<Mood | null>(null);

  function handleSubmit() {
    if (!selected) return;
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem("pathable-wellbeing-today", JSON.stringify({ mood: selected, date: today }));

    const history: { mood: string; date: string }[] = JSON.parse(
      localStorage.getItem("pathable-wellbeing-history") || "[]"
    );
    const existing = history.findIndex((h) => h.date === today);
    if (existing >= 0) history[existing] = { mood: selected, date: today };
    else history.unshift({ mood: selected, date: today });
    localStorage.setItem("pathable-wellbeing-history", JSON.stringify(history.slice(0, 7)));

    // Also sync to API (fire-and-forget)
    const profile = (() => { try { return JSON.parse(localStorage.getItem("pathable-profile") || "{}"); } catch { return {}; } })();
    const userId = profile.name ? profile.name.toLowerCase().replace(/\s+/g, "-") : "demo-user";
    fetch("/api/wellbeing/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mood: selected, checkinDate: today }),
    }).catch(() => {});

    onClose(selected);
  }

  return (
    <div className="fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full mx-auto">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Daily Wellbeing Check-in</h2>
              <p className="text-xs text-muted-foreground">How are you feeling today?</p>
            </div>
            <button onClick={() => onClose()} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={`rounded-xl p-3 border-2 text-left transition-all ${
                  selected === m.id ? m.color + " border-opacity-100" : "border-border bg-muted/30 hover:border-primary/30"
                }`}
                aria-pressed={selected === m.id}
              >
                <span className="text-2xl block mb-1">{m.emoji}</span>
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="text-[11px] opacity-70">{m.desc}</p>
              </button>
            ))}
          </div>

          {selected === "low_energy" && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              💡 Rest-friendly routing activated — routes will prioritise rest stops today.
            </div>
          )}
          {selected === "stressed" && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              💡 Quiet route mode activated — busy zones will be avoided. Nearest sensory room shown on map.
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!selected} className="w-full">
            Check In
          </Button>
        </div>
      </div>
    </div>
  );
}
