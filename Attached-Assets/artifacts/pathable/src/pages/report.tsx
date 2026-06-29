import { useState } from "react";
import {
  useCreateObstacle,
  useListObstacles,
  useConfirmObstacle,
  getListObstaclesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ISSUE_TYPES = [
  { id: "elevator_down", label: "Elevator Down" },
  { id: "wet_floor", label: "Wet Floor" },
  { id: "blocked_ramp", label: "Blocked Ramp" },
  { id: "construction", label: "Construction" },
  { id: "missing_signage", label: "Missing Signage" },
  { id: "other", label: "Other" },
];

const ZONES = [
  "Library", "Science Block", "Engineering Hall", "Student Centre",
  "Admin Building", "Medical Centre", "Sports Complex", "Cafeteria",
  "Block A", "Block B", "Block C", "Campus Pathways", "Car Park",
];

// Rule-based auto-description generator (F19)
function autoDescribe(issueType: string, zone: string): string {
  const descriptions: Record<string, string> = {
    elevator_down: `The elevator in ${zone} appears to be non-functional. This creates a complete access barrier for wheelchair users and those who cannot use stairs. Immediate maintenance notification is recommended.`,
    wet_floor: `A wet floor hazard has been identified in ${zone}. This poses a significant slip risk, particularly for users with mobility aids such as wheelchairs and crutches. Caution signage and prompt cleanup are advised.`,
    blocked_ramp: `An accessible ramp in ${zone} is obstructed and cannot be used. This creates a barrier for wheelchair users and those with mobility impairments attempting to access this area.`,
    construction: `Active construction work in ${zone} is restricting or blocking accessible pathways. An alternative accessible route should be signposted, and affected users should be redirected promptly.`,
    missing_signage: `Accessibility signage is missing or damaged in ${zone}. This affects navigation for visually impaired students and those unfamiliar with the campus layout. Replacement signage is urgently needed.`,
    other: `An accessibility barrier has been reported in ${zone}. The nature of the issue may vary; affected users are advised to exercise caution and seek an alternative route if possible.`,
  };
  return descriptions[issueType] || descriptions.other;
}

function severityColor(s: string | null | undefined) {
  if (s === "high") return "bg-red-100 text-red-800 border-red-200";
  if (s === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-green-100 text-green-800 border-green-200";
}

function issueLabel(type: string) {
  return ISSUE_TYPES.find((t) => t.id === type)?.label ?? type.replace(/_/g, " ");
}

export default function Report() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ reporterName: "", zone: "", issueType: "", description: "" });
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: obstacles, isLoading } = useListObstacles(
    { active: true },
    { query: { queryKey: getListObstaclesQueryKey({ active: true }) } }
  );

  const createObstacle = useCreateObstacle();
  const confirmObstacle = useConfirmObstacle();

  function handleAutoDescribe() {
    if (!form.issueType || !form.zone) {
      toast({ title: "Select issue type and location first", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setForm((f) => ({ ...f, description: autoDescribe(f.issueType, f.zone) }));
      setIsGenerating(false);
      toast({ title: "Description generated", description: "You can edit it before submitting." });
    }, 800);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createObstacle.mutate(
      { data: form as Parameters<typeof createObstacle.mutate>[0]["data"] },
      {
        onSuccess: () => {
          setForm({ reporterName: "", zone: "", issueType: "", description: "" });
          qc.invalidateQueries({ queryKey: getListObstaclesQueryKey() });
          toast({ title: "Report submitted ✓", description: "Thank you for keeping campus safe. +5 pts" });
        },
      }
    );
  }

  function handleConfirm(id: number) {
    confirmObstacle.mutate(
      { id, data: { confirmerName: "Anonymous" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListObstaclesQueryKey() });
          toast({ title: "Confirmed! +3 pts" });
        },
      }
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Report an Issue</h1>
        <p className="text-sm text-muted-foreground mt-1">Help keep campus accessible for everyone</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="font-semibold text-foreground mb-4">Submit New Report</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Your Name</label>
              <input
                required
                value={form.reporterName}
                onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Issue Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ISSUE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, issueType: t.id })}
                    className={`text-xs px-3 py-2 rounded-lg border-2 font-medium transition-all ${
                      form.issueType === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/40 text-foreground"
                    }`}
                    aria-pressed={form.issueType === t.id}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Location</label>
              <select
                required
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Select a zone...</option>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">Description</label>
                <button
                  type="button"
                  onClick={handleAutoDescribe}
                  disabled={isGenerating || !form.issueType || !form.zone}
                  className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-40 transition-opacity"
                  aria-label="Auto-generate description with AI"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isGenerating ? "Generating..." : "AI Describe"}
                </button>
              </div>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder='Describe the issue, or tap "AI Describe" above...'
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!form.reporterName || !form.issueType || !form.zone || !form.description || createObstacle.isPending}
            >
              {createObstacle.isPending ? "Submitting..." : "Submit Report (+5 pts)"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold text-foreground mb-3">Active Reports</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
) : Array.isArray(obstacles) && obstacles.length > 0 ? (
          <div className="space-y-3">
            {obstacles.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{issueLabel(o.issueType)}</p>
                      <p className="text-xs text-muted-foreground">{o.zone} — {o.reporterName}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityColor(o.severity)}`}>
                      {o.severity ?? "low"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{o.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> {o.confirmations} confirmed
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => handleConfirm(o.id)}
                      disabled={confirmObstacle.isPending}
                    >
                      Confirm (+3 pts)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active reports</p>
          </div>
        )}
      </div>
    </div>
  );
}
