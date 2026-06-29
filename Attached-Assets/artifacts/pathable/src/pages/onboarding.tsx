import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISABILITY_TYPES = [
  { id: "mobility", label: "Mobility / Wheelchair", icon: "♿" },
  { id: "visual", label: "Visual Impairment", icon: "👁" },
  { id: "hearing", label: "Hearing Impairment", icon: "👂" },
  { id: "cognitive", label: "Cognitive / Learning", icon: "🧠" },
  { id: "combination", label: "Multiple / Combination", icon: "✦" },
];

const MOBILITY_AIDS = [
  { id: "manual_wheelchair", label: "Manual Wheelchair" },
  { id: "electric_wheelchair", label: "Electric Wheelchair" },
  { id: "crutches", label: "Crutches" },
  { id: "white_cane", label: "White Cane" },
  { id: "none", label: "None" },
];

const NAV_OUTPUTS = [
  { id: "voice", label: "Voice Only", desc: "Spoken turn-by-turn directions" },
  { id: "visual", label: "Visual Only", desc: "Text and map guidance" },
  { id: "all", label: "All Combined", desc: "Voice + visual guidance" },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    name: "",
    disabilityType: "",
    mobilityAid: "",
    navOutput: "all",
  });

  const STEPS = [
    {
      title: "Welcome to PathAble",
      subtitle: "Let's set up your accessibility profile so we can personalise your campus experience.",
      content: (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Your name</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Enter your name"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>
      ),
      canProceed: profile.name.trim().length > 0,
    },
    {
      title: "Disability Type",
      subtitle: "Select all that apply to personalise your routes.",
      content: (
        <div className="grid grid-cols-1 gap-2">
          {DISABILITY_TYPES.map((d) => (
            <button
              key={d.id}
              onClick={() => setProfile({ ...profile, disabilityType: d.id })}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                profile.disabilityType === d.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-xl">{d.icon}</span>
              <span className="text-sm font-medium">{d.label}</span>
              {profile.disabilityType === d.id && <CheckCircle className="h-4 w-4 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      ),
      canProceed: profile.disabilityType !== "",
    },
    {
      title: "Mobility Aid",
      subtitle: "What do you use to get around campus?",
      content: (
        <div className="grid grid-cols-1 gap-2">
          {MOBILITY_AIDS.map((a) => (
            <button
              key={a.id}
              onClick={() => setProfile({ ...profile, mobilityAid: a.id })}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                profile.mobilityAid === a.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-sm font-medium">{a.label}</span>
              {profile.mobilityAid === a.id && <CheckCircle className="h-4 w-4 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      ),
      canProceed: profile.mobilityAid !== "",
    },
    {
      title: "Navigation Preferences",
      subtitle: "How would you like to receive directions?",
      content: (
        <div className="grid grid-cols-1 gap-2">
          {NAV_OUTPUTS.map((n) => (
            <button
              key={n.id}
              onClick={() => setProfile({ ...profile, navOutput: n.id })}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                profile.navOutput === n.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              {profile.navOutput === n.id && <CheckCircle className="h-4 w-4 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      ),
      canProceed: true,
    },
  ];

  const currentStep = STEPS[step];

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("pathable-profile", JSON.stringify(profile));
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pt-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-primary">PathAble</span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Step {step + 1} of {STEPS.length}</p>
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground mb-2">{currentStep.title}</h2>
          <p className="text-sm text-muted-foreground mb-6">{currentStep.subtitle}</p>
          {currentStep.content}
        </div>

        <div className="flex gap-3 py-6">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!currentStep.canProceed}
            className="flex-1 gap-2"
          >
            {step === STEPS.length - 1 ? "Get Started" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
