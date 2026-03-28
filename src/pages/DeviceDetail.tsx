import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { ArrowLeft, Monitor, StopCircle, Play, AlertTriangle, Clock, Package, User, Calendar, FileText, UserMinus } from "lucide-react";
import type { ActivityLog, Device } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import { PharmacyApiError } from "@/api/client";
import LoadingCard from "@/components/LoadingCard";

const LOG_PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

/** Align with backend unassigned check: assigned only when `patientId` (or nested patient id) is set. */
function hasAssignedPatient(d: Device & Record<string, unknown>): boolean {
  const pid = (d as any).patientId ?? (d as any).patient?.id ?? null;
  return pid != null && String(pid).trim() !== "";
}

function deviceSubtitleLines(d: Device & Record<string, unknown>, emptyLabel: string): string {
  const id = String(d.id ?? "").trim();
  const serial = String(d.serialNumber ?? "").trim();
  if (!serial || serial === id) return id || emptyLabel;
  return `${id} · ${serial}`;
}

function formatLogTypeLabel(t: (key: string, opts?: { defaultValue?: string }) => string, type: string): string {
  const human = type.replace(/_/g, " ");
  return t(`deviceDetail.logTypes.${type}`, { defaultValue: human });
}

function parseLogDate(ts: string): Date {
  const [datePart] = ts.split(" ");
  return new Date(datePart + "T00:00:00");
}

const DeviceDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showStopDialog, setShowStopDialog] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [unassignOpen, setUnassignOpen] = useState(false);

  const {
    data: deviceResp,
    isLoading: deviceLoading,
    isError: deviceError,
  } = useQuery({
    queryKey: ["pharmacy", "devices", id],
    enabled: !!id,
    queryFn: () => pharmacyApi.getDevice(id!),
  });

  const device = deviceResp?.item as Device | undefined;
  /** Prefer API `id` (canonical DynamoDB key) so logs match GET even when the URL used spacing variants. */
  const logsDeviceId = (device?.id as string | undefined) ?? id;

  const {
    data: logsResp,
    isLoading: logsLoading,
    isError: logsError,
    error: logsQueryError,
  } = useQuery({
    queryKey: ["pharmacy", "devices", logsDeviceId, "logs"],
    enabled: !!logsDeviceId && !!device,
    queryFn: () => pharmacyApi.getDeviceLogs(logsDeviceId!, { limit: 200 }),
    staleTime: 15_000,
  });

  const logsFetchMessage =
    logsQueryError instanceof PharmacyApiError
      ? logsQueryError.message
      : logsQueryError instanceof Error
        ? logsQueryError.message
        : null;

  /** API may return `description` or elderly-backend `message`. */
  const logsAll = useMemo(() => {
    const raw = (logsResp?.items ?? []) as ActivityLog[];
    return raw.map((row) => {
      const r = row as ActivityLog & { message?: string };
      const description = r.description?.trim() || r.message?.trim() || "";
      return { ...r, description: description || r.description || r.message || t("common.dash") };
    });
  }, [logsResp?.items, t]);

  const logs = useMemo(() => {
    let list = logsAll;
    if (logDateFrom || logDateTo) {
      list = list.filter((l) => {
        const d = parseLogDate(l.timestamp);
        if (logDateFrom && d < new Date(logDateFrom + "T00:00:00")) return false;
        if (logDateTo && d > new Date(logDateTo + "T23:59:59")) return false;
        return true;
      });
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.timestamp.replace(" ", "T")).getTime() - new Date(a.timestamp.replace(" ", "T")).getTime()
    );
  }, [logsAll, logDateFrom, logDateTo]);

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

  const stopMutation = useMutation({
    mutationFn: () => pharmacyApi.stopDispensing(device!.id),
    onSuccess: () => {
      setDeviceStatus("stopped");
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", id] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", logsDeviceId, "logs"] });
      setShowStopDialog(false);
      toast.success(t("deviceDetail.stoppedToast"));
    },
    onError: (e: any) => toast.error(e?.message ?? t("deviceDetail.stopFailed")),
  });

  const resumeMutation = useMutation({
    mutationFn: () => pharmacyApi.resumeDispensing(device!.id),
    onSuccess: () => {
      setDeviceStatus("online");
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", id] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", logsDeviceId, "logs"] });
      toast.success(t("deviceDetail.resumedToast"));
    },
    onError: (e: any) => toast.error(e?.message ?? t("deviceDetail.resumeFailed")),
  });

  const unassignMutation = useMutation({
    mutationFn: (canonicalDeviceId: string) => pharmacyApi.unassignDevice(canonicalDeviceId),
    onSuccess: async (_, canonicalDeviceId) => {
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", id] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", canonicalDeviceId] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", canonicalDeviceId, "logs"] });
      const pid = String((device as any)?.patientId ?? (device as any)?.patient?.id ?? "").trim();
      if (pid) await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients", pid] });
      setUnassignOpen(false);
      toast.success(t("devices.unassignToast"));
    },
    onError: (e: any) => toast.error(e?.message ?? t("devices.unassignFailed")),
  });

  if (deviceLoading) {
    return <LoadingCard message={t("deviceDetail.loading")} />;
  }

  if (deviceError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-4">{t("deviceDetail.loadFailed")}</p>
        <Button variant="outline" onClick={() => navigate("/devices")}>
          {t("deviceDetail.backToDevices")}
        </Button>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">{t("deviceDetail.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/devices")}>
          {t("deviceDetail.backToDevices")}
        </Button>
      </div>
    );
  }

  const assigned = hasAssignedPatient(device);
  const currentStatus = deviceStatus || device.status;
  const remaining = Number(device.remainingPouches);
  const totalPouches = Number(device.totalPouches);
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  const safeTotal = Number.isFinite(totalPouches) && totalPouches > 0 ? totalPouches : 0;
  const dash = t("common.dash");
  const pouchLabel =
    safeTotal > 0 ? `${safeRemaining} / ${safeTotal}` : safeRemaining > 0 ? `${safeRemaining} / ${dash}` : dash;
  const pouchPct = safeTotal > 0 ? Math.min(100, Math.max(0, (safeRemaining / safeTotal) * 100)) : 0;
  const threshold = Number(device.refillThreshold);
  const needsRefill =
    safeTotal > 0 && Number.isFinite(threshold) && safeRemaining <= threshold;
  const headerTitle =
    assigned && String(device.patientName ?? "").trim()
      ? device.patientName
      : t("common.unassignedDevice");

  const handleStopDispensing = () => stopMutation.mutate();
  const handleResumeDispensing = () => resumeMutation.mutate();

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
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </button>

      {/* Device header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Monitor className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{headerTitle}</h1>
            <p className="text-sm text-muted-foreground">{deviceSubtitleLines(device, dash)}</p>
            {!assigned && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("deviceDetail.assignHint")}
              </p>
            )}
          </div>
        </div>
        {assigned && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="destructive"
              size="sm"
              disabled={unassignMutation.isPending}
              onClick={() => setUnassignOpen(true)}
            >
              <UserMinus className="mr-2 h-4 w-4" /> {t("common.unassign")}
            </Button>
            {currentStatus !== "stopped" ? (
              <Button variant="destructive" onClick={() => setShowStopDialog(true)}>
                <StopCircle className="mr-2 h-4 w-4" /> {t("deviceDetail.stopDispensing")}
              </Button>
            ) : (
              <Button variant="success" onClick={handleResumeDispensing}>
                <Play className="mr-2 h-4 w-4" /> {t("deviceDetail.resumeDispensing")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.remainingPouches")}</span>
          </div>
          <p className="text-xl font-bold text-card-foreground">{pouchLabel}</p>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pouchPct}%`,
                backgroundColor: needsRefill ? "hsl(var(--destructive))" : "hsl(var(--success))",
              }}
            />
          </div>
          {needsRefill && (
            <p className="mt-2 text-xs font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />{" "}
              {t("deviceDetail.belowThreshold", {
                threshold: Number.isFinite(threshold) ? threshold : device.refillThreshold,
              })}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.lastDispensed")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">
            {String(device.lastDispensed ?? "").trim() || dash}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.caregiver")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">
            {String(device.assignedCaregiver ?? "").trim() || dash}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.validity")}</span>
          </div>
          {(() => {
            const issue = String(device.issueDate ?? "").trim();
            const validUntil = String(device.validityDate ?? "").trim();
            if (!issue && !validUntil) {
              return <p className="text-sm font-medium text-card-foreground">{dash}</p>;
            }
            return (
              <>
                {issue ? (
                  <p className="text-sm font-medium text-card-foreground">{issue}</p>
                ) : null}
                {validUntil ? (
                  <p className="text-xs text-muted-foreground">
                    {issue
                      ? t("deviceDetail.validityTo", { date: validUntil })
                      : t("deviceDetail.validityUntil", { date: validUntil })}
                  </p>
                ) : null}
              </>
            );
          })()}
        </div>
      </div>

      {/* Activity Logs */}
      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="border-b bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-card-foreground">{t("deviceDetail.activityLogs")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("deviceDetail.logsHint")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <DateInput
                className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
                value={logDateFrom}
                onChange={(e) => setLogDateFrom(e.target.value)}
                aria-label={t("common.fromDate")}
              />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <DateInput
                className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
                value={logDateTo}
                onChange={(e) => setLogDateTo(e.target.value)}
                aria-label={t("common.toDate")}
              />
            </div>
            {(logDateFrom || logDateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setLogDateFrom(""); setLogDateTo(""); setLogPage(1); }}>
                {t("common.clearDates")}
              </Button>
            )}
          </div>
        </div>
        {logsLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">{t("deviceDetail.loadingLogs")}</div>
        ) : logsError ? (
          <div className="p-10 text-center text-sm text-destructive space-y-1">
            <p>{t("deviceDetail.logsLoadFailed")}</p>
            {logsFetchMessage ? (
              <p className="text-xs font-normal text-muted-foreground max-w-md mx-auto">{logsFetchMessage}</p>
            ) : null}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">{t("deviceDetail.noLogsRange")}</p>
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
                    {formatLogTypeLabel(t, log.type)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{t("common.itemsPerPage")}</span>
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
                {t("common.showingRange", { start: logStartItem, end: logEndItem, total: logs.length })}
              </p>
              {logTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logSafePage <= 1}>
                    {t("common.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground px-1">
                    {t("pagination.pageOf", { page: logSafePage, total: logTotalPages })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))} disabled={logSafePage >= logTotalPages}>
                    {t("common.next")}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={unassignOpen}
        onOpenChange={(open) => {
          if (!open && !unassignMutation.isPending) setUnassignOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deviceDetail.unassignTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <Trans
                  i18nKey="deviceDetail.unassignDesc"
                  values={{
                    name:
                      String(device.patientName ?? "").trim() || t("deviceDetail.unassignPatientFallback"),
                  }}
                  components={[<span className="font-medium text-foreground" key="0" />]}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassignMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={unassignMutation.isPending}
              onClick={() => unassignMutation.mutate(String(device.id))}
            >
              {unassignMutation.isPending ? t("common.unassigning") : t("common.unassign")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deviceDetail.stopTitle")}</DialogTitle>
            <DialogDescription>
              {t("deviceDetail.stopDesc", {
                id: device.id,
                patient: String(device.patientName ?? "").trim()
                  ? t("deviceDetail.stopPatientPart", { name: device.patientName })
                  : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStopDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleStopDispensing}>
              {t("deviceDetail.confirmStop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceDetail;
