import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, HelpCircle, Bell, Package } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { pharmacyApi } from "@/api/pharmacy";

type Period = "weekly" | "monthly" | "yearly";

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>("weekly");
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pharmacy", "dashboard"],
    queryFn: async () => {
      try {
        return await pharmacyApi.getDashboard();
      } catch {
        // Backend may temporarily fail; keep the UI usable with safe empty values.
        return { summary: {}, previews: {}, charts: { dispense: { points: [] }, help: { points: [] } } };
      }
    },
    staleTime: 60_000,
  });

  const summary = data?.summary ?? {};
  const previews = data?.previews ?? {};

  const dispenseData = (data as any)?.charts?.dispense?.points ?? [];
  const helpData = (data as any)?.charts?.help?.points ?? [];

  const assignedDevices = summary.assignedDevices ?? 0;
  const totalHardwareDevices = summary.totalHardwareDevices ?? 0;
  const totalDevices = summary.totalDevices ?? 0;
  const onlineDevices = summary.onlineDevices ?? 0;
  const needsRefill = summary.needsRefill ?? 0;
  const pendingHelp = summary.pendingHelp ?? 0;

  const deviceStatusDistribution = [
    { name: "Online", value: summary.onlineDevices ?? 0, color: "hsl(160, 84%, 39%)" },
    { name: "Offline", value: Math.max(0, totalDevices - (summary.onlineDevices ?? 0)), color: "hsl(var(--muted-foreground))" },
    { name: "Error", value: 0, color: "hsl(0, 84%, 60%)" },
    { name: "Stopped", value: 0, color: "hsl(38, 92%, 50%)" },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pharmacy Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time overview of all devices and alerts</p>
      </div>

      {isError && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive">Failed to load dashboard.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Hardware (assigned / total)"
          value={`${assignedDevices} / ${totalHardwareDevices}`}
          icon={<Monitor className="h-5 w-5 text-info" />}
          trend="devices"
          variant="info"
          loading={isLoading}
        />
        <StatCard
          title="Total Devices"
          value={totalDevices}
          icon={<Monitor className="h-5 w-5 text-success" />}
          trend={`${onlineDevices} online`}
          variant="success"
          loading={isLoading}
        />
        <StatCard
          title="Needs Refill"
          value={needsRefill}
          icon={<Package className="h-5 w-5 text-warning" />}
          trend="Below threshold"
          variant="warning"
          loading={isLoading}
        />
        <StatCard
          title="Help Requests"
          value={pendingHelp}
          icon={<HelpCircle className="h-5 w-5 text-destructive" />}
          trend="Pending"
          variant="destructive"
          loading={isLoading}
        />
      </div>

      {/* KPI Charts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Analytics Overview</h2>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Dispensing Activity */}
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Dispensing Activity</h3>
            {isLoading ? (
              <div className="h-[250px] p-5">
                <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
                <div className="mt-4 h-[180px] w-full rounded bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dispenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Area type="monotone" dataKey="dispensed" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Errors & Refills */}
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Errors & Refills</h3>
            {isLoading ? (
              <div className="h-[250px] p-5">
                <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
                <div className="mt-4 h-[180px] w-full rounded bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dispenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="errors" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="refills" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Device Status Distribution */}
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Device Status Distribution</h3>
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center p-5">
                <div className="h-32 w-32 rounded-full bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceStatusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {deviceStatusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Help Requests Trend */}
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Help Requests Trend</h3>
            {isLoading ? (
              <div className="h-[250px] p-5">
                <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
                <div className="mt-4 h-[180px] w-full rounded bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={helpData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="requests" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="resolved" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Devices List */}
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold text-card-foreground">Devices Overview</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/devices")}>View All</Button>
          </div>
          <div className="divide-y">
            {(previews.devices ?? []).map((device: any) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/devices/${device.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <Monitor className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{device.patientName}</p>
                    <p className="text-xs text-muted-foreground">{device.id} • {device.serialNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-card-foreground">
                      {device.remainingPouches}/{device.totalPouches}
                    </p>
                    <p className="text-xs text-muted-foreground">pouches</p>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Refill Notifications */}
          <div className="rounded-xl border bg-card shadow-card">
            <div className="flex items-center gap-2 border-b p-4">
              <Bell className="h-4 w-4 text-warning" />
              <h2 className="font-semibold text-card-foreground">Refill Alerts</h2>
            </div>
            <div className="divide-y">
              {(previews.refillNotifications ?? []).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No refill alerts.</div>
              ) : (
                (previews.refillNotifications ?? []).map((notif: any) => (
                <div
                  key={notif.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/devices/${notif.deviceId}`)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-card-foreground">{notif.patientName}</p>
                    {notif.urgent && (
                      <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Urgent</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{notif.deviceId} — {notif.remainingPouches} pouches left</p>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Help Requests */}
          <div className="rounded-xl border bg-card shadow-card">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-info" />
                <h2 className="font-semibold text-card-foreground">Help Requests</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/help-support")}>View All</Button>
            </div>
            <div className="divide-y">
              {(previews.helpRequests ?? []).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No help requests.</div>
              ) : (
                (previews.helpRequests ?? []).map((req: any) => (
                <div key={req.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-card-foreground">{req.patientName}</p>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{req.deviceId} • {req.timestamp}</p>
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
