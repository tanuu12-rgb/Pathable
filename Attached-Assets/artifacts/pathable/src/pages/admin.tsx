import {
  useGetAdminSummary,
  useGetZoneSummary,
  useListObstacles,
  useListSosAlerts,
  useListCampusAlerts,
  useCreateCampusAlert,
  useDismissCampusAlert,
  useDismissObstacle,
  useEscalateObstacle,
  useConfirmObstacle,
  useResolveSosAlert,
  getGetAdminSummaryQueryKey,
  getGetZoneSummaryQueryKey,
  getListObstaclesQueryKey,
  getListSosAlertsQueryKey,
  getListCampusAlertsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, Siren, Bell, Activity, CheckCircle, X, ArrowUp } from "lucide-react";
import { useState } from "react";

type AlertType = "safety" | "maintenance" | "general";

function issueLabel(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityColor(s: string | null | undefined) {
  if (s === "high") return "bg-red-100 text-red-800";
  if (s === "medium") return "bg-amber-100 text-amber-800";
  return "bg-green-100 text-green-800";
}

function alertTypeBadge(type: AlertType | undefined) {
  if (type === "safety") return "bg-red-100 text-red-800 border-red-200";
  if (type === "maintenance") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function alertTypeIcon(type: AlertType | undefined) {
  if (type === "safety") return "🚨";
  if (type === "maintenance") return "🔧";
  return "ℹ️";
}

export default function Admin() {
  const qc = useQueryClient();
  const [alertMsg, setAlertMsg] = useState("");
  const [alertType, setAlertType] = useState<AlertType>("general");

  const { data: summary } = useGetAdminSummary({ query: { queryKey: getGetAdminSummaryQueryKey() } });
  const { data: zoneSummary } = useGetZoneSummary({ query: { queryKey: getGetZoneSummaryQueryKey() } });
  const { data: obstacles } = useListObstacles({}, { query: { queryKey: getListObstaclesQueryKey({}) } });
  const { data: sosAlerts } = useListSosAlerts({}, { query: { queryKey: getListSosAlertsQueryKey({}) } });
  const { data: campusAlerts } = useListCampusAlerts({ query: { queryKey: getListCampusAlertsQueryKey() } });

  const dismissObstacle = useDismissObstacle();
  const escalateObstacle = useEscalateObstacle();
  const confirmObstacle = useConfirmObstacle();
  const resolveSos = useResolveSosAlert();
  const createAlert = useCreateCampusAlert();
  const dismissAlert = useDismissCampusAlert();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListObstaclesQueryKey() });
    qc.invalidateQueries({ queryKey: getListSosAlertsQueryKey() });
    qc.invalidateQueries({ queryKey: getListCampusAlertsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetAdminSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetZoneSummaryQueryKey() });
  }

const activeObstacles = Array.isArray(obstacles) ? obstacles.filter((o) => o.status === "active") : [];
const activeSos = Array.isArray(sosAlerts) ? sosAlerts.filter((s) => s.status === "active") : [];
const activeAlerts = Array.isArray(campusAlerts) ? campusAlerts.filter((a) => a.status === "active") : [];

const chartData = (Array.isArray(zoneSummary) ? zoneSummary : []).slice(0, 8).map((z) => ({
    zone: z.zone.length > 10 ? z.zone.substring(0, 10) + "…" : z.zone,
    count: z.incidentCount,
  }));

  function pushAlert() {
    if (!alertMsg.trim()) return;
    createAlert.mutate(
      { data: { message: alertMsg, createdBy: "Admin", alertType } },
      { onSuccess: () => { setAlertMsg(""); setAlertType("general"); invalidateAll(); } }
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Lakewood University — Crisis Command</p>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Incidents today", value: summary.activeIncidentsToday, color: "text-primary", icon: Activity },
            { label: "SOS this week", value: summary.sosEventsThisWeek, color: "text-destructive", icon: Siren },
            { label: "Active alerts", value: summary.totalActiveAlerts, color: "text-amber-600", icon: Bell },
            { label: "Top zone", value: summary.mostReportedZone, color: "text-foreground", icon: AlertTriangle, small: true },
          ].map(({ label, value, color, icon: Icon, small }) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
                <p className={`${small ? "text-sm" : "text-2xl"} font-bold ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Zone Chart */}
      {chartData.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold text-foreground mb-3">Incidents by Zone</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="zone" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${199 - i * 15} 89% ${48 + i * 5}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Push Campus Alert */}
      <Card className="mb-6 border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            Push Campus-Wide Alert
          </h2>

          {/* Alert type selector */}
          <div className="flex gap-2 mb-3">
            {(["safety", "maintenance", "general"] as AlertType[]).map((type) => (
              <button
                key={type}
                onClick={() => setAlertType(type)}
                className={`flex-1 text-xs py-1.5 rounded-lg border-2 font-medium capitalize transition-all ${
                  alertType === type
                    ? alertTypeBadge(type) + " border-opacity-100"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                }`}
                aria-pressed={alertType === type}
              >
                {alertTypeIcon(type)} {type}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={alertMsg}
              onChange={(e) => setAlertMsg(e.target.value)}
              placeholder={
                alertType === "safety" ? "e.g. Fire alarm test in Block A at 2pm"
                : alertType === "maintenance" ? "e.g. East elevator under maintenance until 3pm"
                : "e.g. Campus event — some paths closed"
              }
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && pushAlert()}
            />
            <Button onClick={pushAlert} disabled={!alertMsg.trim() || createAlert.isPending} className="shrink-0">
              Send
            </Button>
          </div>

          {activeAlerts.length > 0 && (
            <div className="mt-3 space-y-2">
              {activeAlerts.map((a) => (
                <div key={a.id} className={`flex items-start gap-2 text-xs rounded-lg p-2 border ${alertTypeBadge(a.alertType as AlertType)}`}>
                  <span className="shrink-0">{alertTypeIcon(a.alertType as AlertType)}</span>
                  <span className="flex-1">{a.message}</span>
                  <button
                    onClick={() => dismissAlert.mutate({ id: a.id }, { onSuccess: invalidateAll })}
                    aria-label="Dismiss alert"
                    className="text-current opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Obstacle Reports */}
        <div className="md:col-span-1">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Obstacle Reports ({activeObstacles.length})
          </h2>
          <div className="space-y-2">
            {activeObstacles.length === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center">No active reports</p>
            )}
            {activeObstacles.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-semibold text-foreground">{issueLabel(o.issueType)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${severityColor(o.severity)}`}>
                      {o.severity ?? "low"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-1">{o.zone} — {o.reporterName}</p>
                  <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">{o.description}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">{o.confirmations} confirmations</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => confirmObstacle.mutate({ id: o.id, data: { confirmerName: "Admin" } }, { onSuccess: invalidateAll })}
                      className="flex-1 text-[10px] py-1 rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors flex items-center justify-center gap-0.5"
                    >
                      <CheckCircle className="h-2.5 w-2.5" /> Confirm
                    </button>
                    <button
                      onClick={() => dismissObstacle.mutate({ id: o.id }, { onSuccess: invalidateAll })}
                      className="flex-1 text-[10px] py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-0.5"
                    >
                      <X className="h-2.5 w-2.5" /> Dismiss
                    </button>
                    <button
                      onClick={() => escalateObstacle.mutate({ id: o.id }, { onSuccess: invalidateAll })}
                      className="flex-1 text-[10px] py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 transition-colors flex items-center justify-center gap-0.5"
                    >
                      <ArrowUp className="h-2.5 w-2.5" /> Escalate
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* SOS Alerts */}
        <div className="md:col-span-1">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Siren className="h-4 w-4 text-destructive" />
            SOS Alerts ({activeSos.length})
          </h2>
          <div className="space-y-2">
            {activeSos.length === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center">No active SOS</p>
            )}
            {activeSos.map((s) => (
              <Card key={s.id} className="border-destructive/40 bg-destructive/5">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-foreground">{s.studentName}</p>
                  <p className="text-[11px] text-muted-foreground">{s.zone}</p>
                  <p className="text-[11px] text-muted-foreground capitalize mb-2">{s.disabilityType}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </p>
                  <button
                    onClick={() => resolveSos.mutate({ id: s.id }, { onSuccess: invalidateAll })}
                    className="w-full text-[11px] py-1.5 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 transition-colors flex items-center justify-center gap-1 font-medium"
                  >
                    <CheckCircle className="h-3 w-3" /> Mark Resolved
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Campus Alerts log */}
        <div className="md:col-span-1">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            Alert Log ({activeAlerts.length} active)
          </h2>
          <div className="space-y-2">
            {!campusAlerts?.length && (
              <p className="text-xs text-muted-foreground py-3 text-center">No alerts yet</p>
            )}
{Array.isArray(campusAlerts) && campusAlerts.slice(0, 6).map((a) => (
              <Card key={a.id} className={a.status === "active" ? "" : "opacity-50"}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-1.5 mb-1.5">
                    <span className="text-xs">{alertTypeIcon(a.alertType as AlertType)}</span>
                    <p className="text-xs text-foreground line-clamp-2 flex-1">{a.message}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${alertTypeBadge(a.alertType as AlertType)}`}>
                      {a.alertType ?? "general"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
