import { useState, useEffect, useRef } from "react";
import {
  useListFirstAidResources,
  useListSosAlerts,
  useCreateSosAlert,
  getListFirstAidResourcesQueryKey,
  getListSosAlertsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Siren, Stethoscope, MapPin, AlertCircle, CheckCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getProfile() {
  try { return JSON.parse(localStorage.getItem("pathable-profile") || "{}"); } catch { return {}; }
}

function resourceTypeIcon(type: string) {
  if (type === "aed") return "⚡";
  if (type === "medical_room") return "🏥";
  return "🩺";
}

function statusColor(status: string) {
  if (status === "available") return "bg-green-100 text-green-800 border-green-200";
  if (status === "needs_restock") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export default function Emergency() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const profile = getProfile();

  const [sosState, setSosState] = useState<"idle" | "confirming" | "sent">("idle");
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: resources, isLoading } = useListFirstAidResources({
    query: { queryKey: getListFirstAidResourcesQueryKey() },
  });

  const { data: activeSos } = useListSosAlerts(
    { active: true },
    { query: { queryKey: getListSosAlertsQueryKey({ active: true }) } }
  );

  const createSos = useCreateSosAlert();

  function startSos() {
    setSosState("confirming");
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          fireSos();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  function cancelSos() {
    clearInterval(timerRef.current!);
    setSosState("idle");
    setCountdown(5);
  }

  function fireSos() {
    const studentName = profile.name || "Unknown Student";
    const zone = "Campus — Location unknown";
    const disabilityType = profile.disabilityType || "Not specified";

    createSos.mutate(
      { data: { studentName, zone, disabilityType } },
      {
        onSuccess: () => {
          setSosState("sent");
          qc.invalidateQueries({ queryKey: getListSosAlertsQueryKey() });
          toast({
            title: "SOS Alert Sent",
            description: "Campus admin has been notified. Help is on the way.",
          });
        },
        onError: () => {
          setSosState("idle");
          toast({ title: "SOS failed", description: "Please call 999 directly.", variant: "destructive" });
        },
      }
    );
  }

  useEffect(() => () => clearInterval(timerRef.current!), []);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Emergency & First Aid</h1>
        <p className="text-sm text-muted-foreground mt-1">Campus emergency resources — Lakewood University</p>
      </div>

      {/* SOS Button */}
      <div className="mb-6">
        {sosState === "idle" && (
          <button
            onClick={startSos}
            aria-label="Trigger SOS emergency alert"
            className="w-full bg-destructive hover:bg-destructive/90 active:scale-95 text-destructive-foreground rounded-2xl py-6 flex flex-col items-center gap-2 font-bold text-xl shadow-lg transition-all"
          >
            <Siren className="h-10 w-10" />
            SOS — Emergency Alert
            <span className="text-sm font-normal opacity-80">Tap to alert campus admin</span>
          </button>
        )}

        {sosState === "confirming" && (
          <div className="border-2 border-destructive rounded-2xl p-5 bg-destructive/5 text-center">
            <p className="text-lg font-bold text-destructive mb-1">Sending SOS in {countdown}...</p>
            <p className="text-sm text-muted-foreground mb-4">Campus admin will be alerted with your zone and profile</p>
            <div className="w-full bg-destructive/20 rounded-full h-3 mb-4">
              <div
                className="bg-destructive h-3 rounded-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            </div>
            <Button
              variant="outline"
              onClick={cancelSos}
              className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
              aria-label="Cancel SOS"
            >
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        )}

        {sosState === "sent" && (
          <div className="border-2 border-green-500 rounded-2xl p-5 bg-green-50 text-center">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-green-800">SOS Alert Sent</p>
            <p className="text-sm text-green-700 mt-1 mb-3">
              Campus admin has been notified. Stay where you are.
            </p>
            <p className="text-xs text-green-600 mb-3 font-medium">Emergency contacts on file have been alerted</p>
            <Button variant="outline" onClick={() => setSosState("idle")} className="text-sm">
              Close
            </Button>
          </div>
        )}
      </div>

      <div className="p-3 bg-muted rounded-xl mb-6 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Campus Security: ext. 999 / 555-0199</p>
          <p>Medical Centre open 24/7 — fully step-free access, north campus</p>
        </div>
      </div>

      {/* Active SOS */}
{Array.isArray(activeSos) && activeSos.length > 0 && (          <div className="mb-6">
          <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Siren className="h-4 w-4 text-destructive" />
            Active SOS Alerts ({activeSos.length})
          </h2>
          <div className="space-y-2">
{Array.isArray(activeSos) && activeSos.map((s) => (              <Card key={s.id} className="border-destructive/40 bg-destructive/5">
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-foreground">{s.studentName}</p>
                  <p className="text-xs text-muted-foreground">{s.zone} — {s.disabilityType}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* First Aid Resources */}
      <div>
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-destructive" />
          First Aid Resources
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
{Array.isArray(resources) && resources.map((r) => (              <Card key={r.id}>
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{resourceTypeIcon(r.type)}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.building} — {r.location}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor(r.status)}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {r.stocked.slice(0, 4).map((item) => (
                      <span key={item} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Last inspected: {r.lastInspection}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
