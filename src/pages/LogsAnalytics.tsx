import React, { useState } from "react";
import { BarChart3, Clock, Filter, Package, AlertTriangle, StopCircle, Play, HelpCircle } from "lucide-react";
import { mockActivityLogs, mockDevices } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/StatCard";

const LogsAnalytics: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");

  const filtered = mockActivityLogs.filter((log) => {
    if (typeFilter !== "all" && log.type !== typeFilter) return false;
    if (deviceFilter !== "all" && log.deviceId !== deviceFilter) return false;
    return true;
  });

  const dispenseCount = mockActivityLogs.filter((l) => l.type === "dispense").length;
  const errorCount = mockActivityLogs.filter((l) => l.type === "error").length;
  const refillCount = mockActivityLogs.filter((l) => l.type === "refill").length;

  const logTypeIcons: Record<string, React.ReactNode> = {
    dispense: <Package className="h-4 w-4 text-success" />,
    refill: <Package className="h-4 w-4 text-info" />,
    error: <AlertTriangle className="h-4 w-4 text-destructive" />,
    stop: <StopCircle className="h-4 w-4 text-warning" />,
    start: <Play className="h-4 w-4 text-success" />,
    help: <HelpCircle className="h-4 w-4 text-info" />,
  };

  const logTypeBg: Record<string, string> = {
    dispense: "bg-success/10",
    refill: "bg-info/10",
    error: "bg-destructive/10",
    stop: "bg-warning/10",
    start: "bg-success/10",
    help: "bg-info/10",
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Logs & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Device activity logs and operational analytics</p>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Dispenses" value={dispenseCount} icon={<Package className="h-5 w-5 text-success" />} variant="success" />
        <StatCard title="Errors Logged" value={errorCount} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} variant="destructive" />
        <StatCard title="Refills" value={refillCount} icon={<Package className="h-5 w-5 text-info" />} variant="info" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="dispense">Dispense</SelectItem>
            <SelectItem value="refill">Refill</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="stop">Stop</SelectItem>
            <SelectItem value="start">Start</SelectItem>
            <SelectItem value="help">Help</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deviceFilter} onValueChange={setDeviceFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            {mockDevices.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(typeFilter !== "all" || deviceFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter("all"); setDeviceFilter("all"); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Logs table */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-md ${logTypeBg[log.type]}`}>
                      {logTypeIcons[log.type]}
                    </div>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{log.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-card-foreground">{log.deviceId}</td>
                <td className="px-4 py-3 text-sm text-card-foreground">{log.description}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {log.timestamp}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">No logs found matching filters</div>
        )}
      </div>
    </div>
  );
};

export default LogsAnalytics;
