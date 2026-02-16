import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Monitor, StopCircle, Play, AlertTriangle, Clock, Package, User, Calendar } from "lucide-react";
import { mockDevices, mockActivityLogs } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);

  const device = mockDevices.find((d) => d.id === id);
  const logs = mockActivityLogs.filter((l) => l.deviceId === id);

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Device not found</p>
        <Button variant="outline" onClick={() => navigate("/devices")}>Back to Devices</Button>
      </div>
    );
  }

  const currentStatus = deviceStatus || device.status;
  const needsRefill = device.remainingPouches <= device.refillThreshold;

  const handleStopDispensing = () => {
    setDeviceStatus("stopped");
    setShowStopDialog(false);
    toast.success("Dispensing stopped", { description: `Stop command sent to ${device.id}` });
  };

  const handleResumeDispensing = () => {
    setDeviceStatus("online");
    toast.success("Dispensing resumed", { description: `Resume command sent to ${device.id}` });
  };

  const logTypeIcons: Record<string, React.ReactNode> = {
    dispense: <Package className="h-4 w-4 text-success" />,
    refill: <Package className="h-4 w-4 text-info" />,
    error: <AlertTriangle className="h-4 w-4 text-destructive" />,
    stop: <StopCircle className="h-4 w-4 text-warning" />,
    start: <Play className="h-4 w-4 text-success" />,
    help: <AlertTriangle className="h-4 w-4 text-info" />,
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Device header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Monitor className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{device.patientName}</h1>
            <p className="text-sm text-muted-foreground">{device.id} • {device.serialNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={currentStatus as any} />
          {currentStatus !== "stopped" ? (
            <Button variant="destructive" onClick={() => setShowStopDialog(true)}>
              <StopCircle className="mr-2 h-4 w-4" /> Stop Dispensing
            </Button>
          ) : (
            <Button onClick={handleResumeDispensing} className="bg-success hover:bg-success/90 text-success-foreground">
              <Play className="mr-2 h-4 w-4" /> Resume Dispensing
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Remaining Pouches</span>
          </div>
          <p className="text-xl font-bold text-card-foreground">{device.remainingPouches} / {device.totalPouches}</p>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(device.remainingPouches / device.totalPouches) * 100}%`,
                backgroundColor: needsRefill ? "hsl(var(--destructive))" : "hsl(var(--success))",
              }}
            />
          </div>
          {needsRefill && (
            <p className="mt-2 text-xs font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Below refill threshold ({device.refillThreshold})
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Last Dispensed</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{device.lastDispensed}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Caregiver</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{device.assignedCaregiver}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Validity</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{device.issueDate}</p>
          <p className="text-xs text-muted-foreground">to {device.validityDate}</p>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="border-b p-4">
          <h2 className="font-semibold text-card-foreground">Activity Logs</h2>
        </div>
        <div className="divide-y">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No activity logs</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-4">
                <div className="mt-0.5">{logTypeIcons[log.type]}</div>
                <div className="flex-1">
                  <p className="text-sm text-card-foreground">{log.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{log.type}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stop Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Dispensing</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop dispensing for device {device.id} ({device.patientName})? The patient will not receive medication until dispensing is resumed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStopDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleStopDispensing}>Confirm Stop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceDetail;
