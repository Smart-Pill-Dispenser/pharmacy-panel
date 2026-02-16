import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, AlertTriangle, HelpCircle, Activity, Bell, Package } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { mockDevices, mockHelpRequests, mockRefillNotifications } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const weeklyDispenseData = [
  { name: "Mon", dispensed: 12, errors: 1, refills: 2 },
  { name: "Tue", dispensed: 18, errors: 0, refills: 1 },
  { name: "Wed", dispensed: 15, errors: 2, refills: 0 },
  { name: "Thu", dispensed: 20, errors: 1, refills: 3 },
  { name: "Fri", dispensed: 16, errors: 0, refills: 1 },
  { name: "Sat", dispensed: 10, errors: 1, refills: 0 },
  { name: "Sun", dispensed: 8, errors: 0, refills: 2 },
];

const monthlyDispenseData = [
  { name: "Week 1", dispensed: 85, errors: 4, refills: 8 },
  { name: "Week 2", dispensed: 92, errors: 2, refills: 10 },
  { name: "Week 3", dispensed: 78, errors: 6, refills: 7 },
  { name: "Week 4", dispensed: 99, errors: 3, refills: 12 },
];

const yearlyDispenseData = [
  { name: "Jan", dispensed: 320, errors: 12, refills: 30 },
  { name: "Feb", dispensed: 354, errors: 8, refills: 37 },
  { name: "Mar", dispensed: 290, errors: 15, refills: 25 },
  { name: "Apr", dispensed: 410, errors: 5, refills: 40 },
  { name: "May", dispensed: 380, errors: 10, refills: 35 },
  { name: "Jun", dispensed: 340, errors: 7, refills: 32 },
  { name: "Jul", dispensed: 360, errors: 9, refills: 28 },
  { name: "Aug", dispensed: 390, errors: 11, refills: 38 },
  { name: "Sep", dispensed: 310, errors: 14, refills: 26 },
  { name: "Oct", dispensed: 420, errors: 6, refills: 42 },
  { name: "Nov", dispensed: 370, errors: 8, refills: 34 },
  { name: "Dec", dispensed: 350, errors: 10, refills: 30 },
];

const deviceStatusData = [
  { name: "Online", value: 3, color: "hsl(160, 84%, 39%)" },
  { name: "Offline", value: 1, color: "hsl(var(--muted-foreground))" },
  { name: "Error", value: 1, color: "hsl(0, 84%, 60%)" },
  { name: "Stopped", value: 1, color: "hsl(38, 92%, 50%)" },
];

const weeklyHelpData = [
  { name: "Mon", requests: 2, resolved: 1 },
  { name: "Tue", requests: 1, resolved: 1 },
  { name: "Wed", requests: 3, resolved: 2 },
  { name: "Thu", requests: 0, resolved: 1 },
  { name: "Fri", requests: 2, resolved: 2 },
  { name: "Sat", requests: 1, resolved: 0 },
  { name: "Sun", requests: 0, resolved: 0 },
];

const monthlyHelpData = [
  { name: "Week 1", requests: 8, resolved: 6 },
  { name: "Week 2", requests: 5, resolved: 5 },
  { name: "Week 3", requests: 10, resolved: 7 },
  { name: "Week 4", requests: 6, resolved: 4 },
];

const yearlyHelpData = [
  { name: "Jan", requests: 22, resolved: 18 },
  { name: "Feb", requests: 18, resolved: 15 },
  { name: "Mar", requests: 30, resolved: 24 },
  { name: "Apr", requests: 15, resolved: 14 },
  { name: "May", requests: 20, resolved: 19 },
  { name: "Jun", requests: 25, resolved: 20 },
  { name: "Jul", requests: 18, resolved: 16 },
  { name: "Aug", requests: 22, resolved: 20 },
  { name: "Sep", requests: 28, resolved: 22 },
  { name: "Oct", requests: 12, resolved: 12 },
  { name: "Nov", requests: 16, resolved: 14 },
  { name: "Dec", requests: 20, resolved: 17 },
];

type Period = "weekly" | "monthly" | "yearly";

const getDispenseData = (p: Period) =>
  p === "weekly" ? weeklyDispenseData : p === "monthly" ? monthlyDispenseData : yearlyDispenseData;
const getHelpData = (p: Period) =>
  p === "weekly" ? weeklyHelpData : p === "monthly" ? monthlyHelpData : yearlyHelpData;

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>("weekly");
  const navigate = useNavigate();

  const dispenseData = getDispenseData(period);
  const helpData = getHelpData(period);

  const onlineDevices = mockDevices.filter((d) => d.status === "online").length;
  const errorDevices = mockDevices.filter((d) => d.status === "error").length;
  const needsRefill = mockDevices.filter((d) => d.remainingPouches <= d.refillThreshold).length;
  const pendingHelp = mockHelpRequests.filter((h) => h.status !== "resolved").length;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pharmacy Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time overview of all devices and alerts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Devices" value={mockDevices.length} icon={<Monitor className="h-5 w-5 text-accent-foreground" />} trend={`${onlineDevices} online`} />
        <StatCard title="Needs Refill" value={needsRefill} icon={<Package className="h-5 w-5 text-warning" />} variant="warning" trend="Below threshold" />
        <StatCard title="Device Errors" value={errorDevices} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} variant="destructive" />
        <StatCard title="Help Requests" value={pendingHelp} icon={<HelpCircle className="h-5 w-5 text-info" />} variant="info" trend="Pending" />
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
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dispenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                <Area type="monotone" dataKey="dispensed" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Errors & Refills */}
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Errors & Refills</h3>
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
          </div>

          {/* Device Status Distribution */}
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Device Status Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={deviceStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                  {deviceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Help Requests Trend */}
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Help Requests Trend</h3>
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
            {mockDevices.map((device) => (
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
                    <p className="text-sm text-card-foreground">{device.remainingPouches}/{device.totalPouches}</p>
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
              {mockRefillNotifications.map((notif) => (
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
              ))}
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
              {mockHelpRequests.filter((h) => h.status !== "resolved").map((req) => (
                <div key={req.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-card-foreground">{req.patientName}</p>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{req.deviceId} • {req.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
