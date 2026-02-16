import React from "react";
import { useNavigate } from "react-router-dom";
import { Monitor, AlertTriangle, HelpCircle, Activity, Bell, Package } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { mockDevices, mockHelpRequests, mockRefillNotifications } from "@/data/mockData";
import { Button } from "@/components/ui/button";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

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
