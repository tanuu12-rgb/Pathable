import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TourStep {
  title: string;
  description: string;
  emoji: string;
  narration: string;
}

const STEPS: TourStep[] = [
  {
    emoji: "👤",
    title: "Set Up Your Profile",
    description: "Tell PathAble about your disability type and mobility aid so routes are personalised just for you.",
    narration: "Welcome to PathAble! Let's start by setting up your accessibility profile. This takes under 60 seconds.",
  },
  {
    emoji: "🗺️",
    title: "Navigate the Campus",
    description: "Use the interactive map to find step-free routes, see crowd density, and get turn-by-turn directions.",
    narration: "The Navigate screen shows an interactive campus map. Pick your destination and tap Go to get accessible step-by-step directions.",
  },
  {
    emoji: "🚨",
    title: "SOS Emergency Button",
    description: "The red SOS button is always visible at the bottom right. One tap alerts campus admin within seconds.",
    narration: "In an emergency, tap the red SOS button on the bottom navigation bar. A 5-second countdown lets you cancel if needed.",
  },
  {
    emoji: "⚠️",
    title: "Report an Issue",
    description: "Spot an elevator down or blocked ramp? Report it in seconds so other students can avoid it.",
    narration: "Use the Report tab to flag accessibility barriers like broken elevators or wet floors. Your reports help everyone on campus.",
  },
  {
    emoji: "🛡️",
    title: "Sensory Safe Rooms",
    description: "Find quiet, sensory-friendly spaces across campus. Check in so others know a space is occupied.",
    narration: "The Safe Rooms section lists all sensory-friendly spaces with real-time availability. Tap Navigate to get directions there.",
  },
];

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  window.speechSynthesis.speak(utt);
}

export default function Tour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    speak(STEPS[step].narration);
  }, [step]);

  function handleComplete() {
    window.speechSynthesis?.cancel();
    localStorage.setItem("pathable-tour-done", "1");
    const pts = parseInt(localStorage.getItem("pathable-tour-pts") || "0") + 10;
    localStorage.setItem("pathable-tour-pts", String(pts));
    toast({ title: "🎉 Campus Ready!", description: "Tour complete! You earned the Campus Ready badge + 10 pts." });
    onComplete();
  }

  function handleSkip() {
    window.speechSynthesis?.cancel();
    localStorage.setItem("pathable-tour-done", "1");
    onComplete();
  }

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full mx-auto overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted">
          <div
            className="h-1.5 bg-primary transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground font-medium">
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              aria-label="Skip tour"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{current.emoji}</div>
            <h2 className="text-xl font-bold text-foreground mb-2">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === step ? "w-6 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5" aria-label="Previous step">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={() => (step === STEPS.length - 1 ? handleComplete() : setStep(step + 1))}
              className="flex-1 gap-2"
            >
              {step === STEPS.length - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Finish Tour
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
