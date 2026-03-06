import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Monitor, StopCircle, Play, AlertTriangle, Clock, Package, User, Calendar, FileText } from "lucide-react";
import { mockDevices, mockActivityLogs } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const LOG_PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function parseLogDate(ts: string): Date {
  const [datePart] = ts.split(" ");
  return new Date(datePart + "T00:00:00");
}

const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);

  const device = mockDevices.find((d) => d.id === id);
  const logs = useMemo(() => {
    let list = (id ? mockActivityLogs.filter((l) => l.deviceId === id) : []) as typeof mockActivityLogs;
    if (logDateFrom || logDateTo) {
      list = list.filter((l) => {
        const d = parseLogDate(l.timestamp);
        if (logDateFrom && d < new Date(logDateFrom + "T00:00:00")) return false;
        if (logDateTo && d > new Date(logDateTo + "T23:59:59")) return false;
        return true;
      });
    }
    return [...list].sort((a, b) => new Date(b.timestamp.replace(" ", "T")).getTime() - new Date(a.timestamp.replace(" ", "T")).getTime());
  }, [id, logDateFrom, logDateTo]);

  const logTotalPages = Math.max(1, Math.ceil(logs.length / logPageSize));
  const logSafePage = Math.min(Math.max(1, logPage), logTotalPages);
  useEffect(() => {
    if (logPage > logTotalPages && logTotalPages >= 1) setLogPage(logTotalPages);
  }, [logPage, logTotalPages]);
  useEffect(() => {
    setLogPage(1);
  }, [logDateFrom, logDateTo]);
  const paginatedLogs = useMemo(
    () => logs.slice((logSafePage - 1) * logPageSize, logSafePage * logPageSize),
    [logs, logSafePage, logPageSize]
  );
  const logStartItem = logs.length === 0 ? 0 : (logSafePage - 1) * logPageSize + 1;
  const logEndItem = Math.min(logSafePage * logPageSize, logs.length);

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
  const defaultLogIcon = <FileText className="h-4 w-4 text-muted-foreground" />;

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
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="border-b bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-card-foreground">Activity Logs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Chronological order (newest first).</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Input type="date" className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0" value={logDateFrom} onChange={(e) => setLogDateFrom(e.target.value)} aria-label="From date" />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <Input type="date" className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0" value={logDateTo} onChange={(e) => setLogDateTo(e.target.value)} aria-label="To date" />
            </div>
            {(logDateFrom || logDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setLogDateFrom(""); setLogDateTo(""); setLogPage(1); }}>Clear dates</Button>
            )}
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No activity logs for this device in the selected range.</p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {paginatedLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                    {logTypeIcons[log.type] ?? defaultLogIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{log.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {log.timestamp}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {log.type.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</span>
                <Select
                  value={String(logPageSize)}
                  onValueChange={(v) => { setLogPageSize(Number(v)); setLogPage(1); }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Showing {logStartItem} to {logEndItem} of {logs.length} results
              </p>
              {logTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logSafePage <= 1}>
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-1">Page {logSafePage} of {logTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))} disabled={logSafePage >= logTotalPages}>
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
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
