import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Monitor, HelpCircle, Bell, Package, UserCheck } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { pharmacyApi } from "@/api/pharmacy";

type Period = "weekly" | "monthly" | "yearly";

function badgeStatus(s: string): "online" | "offline" | "error" | "stopped" | "pending" | "resolved" | "in_progress" {
  const x = String(s ?? "").toLowerCase();
  if (x === "online" || x === "offline" || x === "error" || x === "stopped") return x;
  if (x === "pending" || x === "resolved" || x === "in_progress") return x;
  if (x === "active") return "online";
  return "offline";
}

function invHasPatient(d: Record<string, unknown>): boolean {
  const pid = d.patientId ?? (d.patient as { id?: string } | undefined)?.id;
  return pid != null && String(pid).trim() !== "";
}

function invStatusLower(s: unknown): string {
  return String(s ?? "offline").toLowerCase();
}

function invNeedsRefillAdminKpi(d: Record<string, unknown>): boolean {
  const remaining = Number(d.remainingPouches ?? d.dosesRemaining ?? 0);
  const td = Number(d.totalPouches ?? d.totalDoses ?? 0);
  const legacyPlaceholder = td === 28 && remaining === 0;
  const rem = legacyPlaceholder ? 0 : remaining;
  return rem <= 5;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("weekly");
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pharmacy", "dashboard", period],
    queryFn: () => pharmacyApi.getDashboard({ period }),
    staleTime: 30_000,
  });

  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ["pharmacy", "devices", "dashboard-inventory"],
    queryFn: () => pharmacyApi.getDevices({ limit: 500 }),
    staleTime: 30_000,
  });

  const summary = data?.summary ?? {};
  const previews = data?.previews ?? {};

  const dispenseData = (data as any)?.charts?.dispense?.points ?? [];
  const helpData = (data as any)?.charts?.help?.points ?? [];

  /** GET /pharmacy/devices includes global pool server-side; use as fallback if dashboard payload is behind an older API. */
  const invItems = (inventory?.items ?? []) as Record<string, unknown>[];
  const invCount = inventory?.count ?? invItems.length;
  const dashTotalDevices = summary.totalDevices ?? 0;
  const preferInventoryKpis =
    invCount > dashTotalDevices || (dashTotalDevices === 0 && invCount > 0);

  const kpiLoading = isLoading || invLoading;

  const {
    totalDevices,
    assignedDeviceCount,
    needsRefillCount,
    deviceStatusDistribution,
  } = useMemo(() => {
    if (!preferInventoryKpis || invItems.length === 0) {
      const total = dashTotalDevices;
      const online = summary.onlineDevices ?? 0;
      return {
        totalDevices: total,
        assignedDeviceCount: summary.assignedDevices ?? 0,
        needsRefillCount: summary.needsRefill ?? 0,
        deviceStatusDistribution: [
          { name: t("dashboard.chartOnline"), value: online, color: "hsl(160, 84%, 39%)" },
          {
            name: t("dashboard.chartOffline"),
            value: summary.offlineDevices ?? Math.max(0, total - online),
            color: "hsl(var(--muted-foreground))",
          },
          { name: t("dashboard.chartError"), value: summary.errorDevices ?? 0, color: "hsl(0, 84%, 60%)" },
          { name: t("dashboard.chartStopped"), value: summary.stoppedDevices ?? 0, color: "hsl(38, 92%, 50%)" },
        ],
      };
    }
    let online = 0;
    let offline = 0;
    let errorN = 0;
    let stopped = 0;
    for (const d of invItems) {
      const s = invStatusLower(d.status);
      if (s === "online") online++;
      else if (s === "error") errorN++;
      else if (s === "stopped") stopped++;
      else offline++;
    }
    const assigned = invItems.filter(invHasPatient).length;
    const refill = invItems.filter((d) => invHasPatient(d) && invNeedsRefillAdminKpi(d)).length;
    const refillFromSummary = Number(summary.needsRefill ?? 0);
    return {
      totalDevices: invCount,
      assignedDeviceCount: assigned,
      needsRefillCount: Math.max(refill, refillFromSummary),
      deviceStatusDistribution: [
        { name: t("dashboard.chartOnline"), value: online, color: "hsl(160, 84%, 39%)" },
        { name: t("dashboard.chartOffline"), value: offline, color: "hsl(var(--muted-foreground))" },
        { name: t("dashboard.chartError"), value: errorN, color: "hsl(0, 84%, 60%)" },
        { name: t("dashboard.chartStopped"), value: stopped, color: "hsl(38, 92%, 50%)" },
      ],
    };
  }, [preferInventoryKpis, invItems, invCount, dashTotalDevices, summary, t]);

  const pendingAlerts = summary.pendingAlerts ?? 0;

  const devicesOverviewRows = useMemo(() => {
    const fromDash = (previews.devices ?? []) as any[];
    if (preferInventoryKpis && invItems.length > 0) {
      return invItems.slice(0, 8).map((d) => {
        const id = String(d.id ?? "");
        const serial = String(d.serialNumber ?? "").trim();
        const sub = serial && serial !== id ? `${id} · ${serial}` : id;
        return {
          id,
          patientName: invHasPatient(d)
            ? String(d.patientName ?? t("common.patient")).trim() || t("common.patient")
            : t("common.unassigned"),
          serialNumber: sub,
          remainingPouches: Number(d.remainingPouches ?? d.dosesRemaining ?? 0),
          totalPouches: Number(d.totalPouches ?? d.totalDoses ?? 0) || 1,
          status: invStatusLower(d.status),
        };
      });
    }
    if (fromDash.length > 0) return fromDash;
    return [];
  }, [previews.devices, preferInventoryKpis, invItems, t]);

  const pieHasData = deviceStatusDistribution.some((d) => d.value > 0);
  const dispenseHasData = dispenseData.some((p: any) => (p.dispensed ?? 0) + (p.errors ?? 0) + (p.refills ?? 0) > 0);
  const helpTrendHasData = helpData.some((p: any) => (p.requests ?? 0) + (p.resolved ?? 0) > 0);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
      </div>

      {isError && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive">{t("dashboard.loadFailed")}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {(error as Error)?.message ?? t("dashboard.connectionHint")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalDevices")}
          value={totalDevices}
          icon={<Monitor className="h-5 w-5 text-info" />}
          trend={t("dashboard.trendDevices")}
          variant="info"
          loading={kpiLoading}
        />
        <StatCard
          title={t("dashboard.assignedDevices")}
          value={assignedDeviceCount}
          icon={<UserCheck className="h-5 w-5 text-success" />}
          trend={t("dashboard.trendWithPatient")}
          variant="success"
          loading={kpiLoading}
        />
        <StatCard
          title={t("dashboard.needsRefill")}
          value={needsRefillCount}
          icon={<Package className="h-5 w-5 text-warning" />}
          trend={t("dashboard.trendBelowThreshold")}
          variant="warning"
          loading={kpiLoading}
        />
        <StatCard
          title={t("dashboard.pendingAlerts")}
          value={pendingAlerts}
          icon={<HelpCircle className="h-5 w-5 text-destructive" />}
          trend={t("dashboard.trendUnacknowledged")}
          variant="destructive"
          loading={kpiLoading}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">{t("dashboard.analyticsOverview")}</h2>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="weekly">{t("dashboard.weekly")}</TabsTrigger>
              <TabsTrigger value="monthly">{t("dashboard.monthly")}</TabsTrigger>
              <TabsTrigger value="yearly">{t("dashboard.yearly")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">{t("dashboard.dispensingActivity")}</h3>
            {isLoading ? (
              <div className="h-[250px] p-5">
                <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
                <div className="mt-4 h-[180px] w-full rounded bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : !dispenseHasData ? (
              <p className="h-[250px] flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
                {t("dashboard.noDispensePeriod")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dispenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="dispensed" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">{t("dashboard.errorsRefills")}</h3>
            {isLoading ? (
              <div className="h-[250px] p-5">
                <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
                <div className="mt-4 h-[180px] w-full rounded bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : !dispenseHasData ? (
              <p className="h-[250px] flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
                {t("dashboard.noErrorsRefills")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dispenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="errors" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="refills" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">{t("dashboard.distribution")}</h3>
            {kpiLoading ? (
              <div className="h-[250px] flex items-center justify-center p-5">
                <div className="h-32 w-32 rounded-full bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : !pieHasData ? (
              <p className="h-[250px] flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
                {t("dashboard.noDevicesPharmacy")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceStatusDistribution.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {deviceStatusDistribution
                      .filter((d) => d.value > 0)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">{t("dashboard.helpTrend")}</h3>
            {isLoading ? (
              <div className="h-[250px] p-5">
                <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
                <div className="mt-4 h-[180px] w-full rounded bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : !helpTrendHasData ? (
              <p className="h-[250px] flex items-center justify-center text-sm text-muted-foreground px-4 text-center">
                {t("dashboard.noHelpPeriod")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={helpData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="requests" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 4 }} name={t("dashboard.legendOpened")} />
                  <Line type="monotone" dataKey="resolved" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 4 }} name={t("dashboard.legendResolved")} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold text-card-foreground">{t("dashboard.devicesOverview")}</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/devices")}>
              {t("common.viewAll")}
            </Button>
          </div>
          <div className="divide-y">
            {devicesOverviewRows.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">{t("dashboard.noDevicesLinked")}</div>
            ) : (
              devicesOverviewRows.map((device: any) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/devices/${encodeURIComponent(device.id)}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                      <Monitor className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">{device.patientName}</p>
                      <p className="text-xs text-muted-foreground">{device.serialNumber ?? device.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm text-card-foreground">
                        {device.remainingPouches}/{device.totalPouches}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("common.pouches")}</p>
                    </div>
                    <StatusBadge status={badgeStatus(device.status)} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card shadow-card">
            <div className="flex items-center gap-2 border-b p-4">
              <Bell className="h-4 w-4 text-warning" />
              <h2 className="font-semibold text-card-foreground">{t("dashboard.refillAlerts")}</h2>
            </div>
            <div className="divide-y">
              {(previews.refillNotifications ?? []).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">{t("dashboard.noRefillThreshold")}</div>
              ) : (
                (previews.refillNotifications ?? []).map((notif: any) => (
                  <div
                    key={notif.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/devices/${encodeURIComponent(notif.deviceId)}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-card-foreground">{notif.patientName}</p>
                      {notif.urgent && (
                        <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          {t("common.urgent")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("common.pouchesLeftLine", { deviceId: notif.deviceId, count: notif.remainingPouches, threshold: notif.threshold })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-info" />
                <h2 className="font-semibold text-card-foreground">{t("dashboard.sosHelp")}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/help-support")}>
                {t("common.viewAll")}
              </Button>
            </div>
            <div className="divide-y">
              {(previews.helpRequests ?? []).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">{t("dashboard.noSosHelp")}</div>
              ) : (
                (previews.helpRequests ?? []).map((req: any) => (
                  <div key={req.id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-card-foreground">{req.patientName}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {req.requestSource === "sos" && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            {t("dashboard.sos")}
                          </span>
                        )}
                        {req.requestSource === "help" && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-info bg-info/10 px-2 py-0.5 rounded-full">
                            {t("dashboard.help")}
                          </span>
                        )}
                        <StatusBadge status={badgeStatus(req.status)} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.deviceId} • {req.timestamp}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
