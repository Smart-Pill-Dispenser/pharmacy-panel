import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Filter, Monitor, Search, UserPlus, UserMinus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import LoadingCard from "@/components/LoadingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { usePatients } from "@/contexts/PatientsContext";
import { recordTimeMs, sortRecordsNewestFirst } from "@/lib/listSort";

type DeviceRow = {
  id: string;
  /** Human-facing serial / label when different from Dynamo `id` (tablet often uses this). */
  serialNumber: string | null;
  patientId: string | null;
  patientLabel: string | null;
};

function patientInfoFromDevice(
  d: Record<string, unknown>,
  patientFallback: string
): { patientId: string | null; patientLabel: string | null } {
  const pid = d.patientId ?? (d.patient as { id?: string } | undefined)?.id;
  const patientIdStr = pid != null && String(pid).trim() !== "" ? String(pid) : null;
  if (!patientIdStr) return { patientId: null, patientLabel: null };
  const name = (d.patientName ?? d.name) as string | undefined;
  const nt = typeof name === "string" ? name.trim() : "";
  const label = nt && nt !== "—" ? nt : patientFallback;
  return { patientId: patientIdStr, patientLabel: label };
}

function mergePatientFromAssignments(
  deviceId: string,
  serialCandidates: string[],
  fromDevice: { patientId: string | null; patientLabel: string | null },
  patientByDeviceId: Map<string, { patientId: string; patientLabel: string }>
): { patientId: string | null; patientLabel: string | null } {
  let { patientId, patientLabel } = fromDevice;
  if (!patientId) {
    for (const key of serialCandidates) {
      const k = key.trim();
      if (!k) continue;
      const alt = patientByDeviceId.get(k);
      if (alt) {
        patientId = alt.patientId;
        patientLabel = alt.patientLabel;
        break;
      }
    }
  }
  return { patientId, patientLabel };
}

function deviceSerialFromRecord(d: Record<string, unknown>): string | null {
  const s = String(d.serialNumber ?? "").trim();
  return s || null;
}

function rowSearchHaystack(row: DeviceRow): string {
  const parts = [row.id, row.serialNumber ?? "", row.patientLabel ?? ""].filter(Boolean);
  return parts.join("\n").toLowerCase();
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const NONE_PATIENT = "__none__";

const Devices: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patients: addedPatients } = usePatients();
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [assignDeviceId, setAssignDeviceId] = useState<string | null>(null);
  const [assignPatientId, setAssignPatientId] = useState<string>(NONE_PATIENT);
  const [unassignTarget, setUnassignTarget] = useState<{ deviceId: string; patientLabel: string } | null>(null);

  const { data: patientsListData } = useQuery({
    queryKey: ["pharmacy", "patients"],
    queryFn: () => pharmacyApi.listPatients({ limit: 5000 }),
    staleTime: 30_000,
  });

  const patientsForAssign = useMemo(() => {
    const items = (patientsListData?.items ?? []) as Record<string, unknown>[];
    const apiPatients = items
      .map((p) => ({
        id: String(p.patientId ?? p.id ?? ""),
        name: String(p.fullName ?? ""),
        deviceId: typeof p.assignedDeviceId === "string" ? p.assignedDeviceId : undefined,
      }))
      .filter((p) => p.id && p.name);
    const apiIds = new Set(apiPatients.map((p) => p.id));
    const fromAdded = addedPatients
      .filter((p) => !apiIds.has(p.id))
      .map((p) => ({
        id: p.id,
        name: p.fullName,
        deviceId: p.assignedDeviceId ?? undefined,
      }));
    return [...apiPatients, ...fromAdded];
  }, [patientsListData, addedPatients]);

  /** Prefer patients without a device so assignment is unambiguous. */
  const assignablePatients = useMemo(
    () => patientsForAssign.filter((p) => !p.deviceId),
    [patientsForAssign]
  );

  const assignMutation = useMutation({
    mutationFn: async ({ deviceId, patientId, patientName }: { deviceId: string; patientId: string; patientName: string }) =>
      pharmacyApi.assignDeviceToPatient(deviceId, { patientId, patientName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
      toast.success(t("devices.assignToast"));
      setAssignDeviceId(null);
      setAssignPatientId(NONE_PATIENT);
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? t("devices.assignFailed"));
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (deviceId: string) => pharmacyApi.unassignDevice(deviceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
      toast.success(t("devices.unassignToast"));
      setUnassignTarget(null);
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? t("devices.unassignFailed"));
    },
  });

  const { data: devicesData, isLoading: loadingOrg, isError: errOrg } = useQuery({
    queryKey: ["pharmacy", "devices"],
    queryFn: () => pharmacyApi.getDevices(),
    staleTime: 0,
  });

  const { data: unassignedData, isLoading: loadingUnassigned, isError: errUnassigned } = useQuery({
    queryKey: ["pharmacy", "devices", "unassigned"],
    queryFn: () => pharmacyApi.getUnassignedDevices(),
    staleTime: 0,
  });

  const isLoading = loadingOrg || loadingUnassigned;
  const isError = errOrg || errUnassigned;

  /** If patient has `assignedDeviceId` but device row lacked `patientId` (legacy rows), still treat as assigned. */
  const patientByDeviceId = useMemo(() => {
    const m = new Map<string, { patientId: string; patientLabel: string }>();
    const items = (patientsListData?.items ?? []) as Record<string, unknown>[];
    const byPatientId = new Map<string, Record<string, unknown>>();
    for (const it of items) {
      const pid = String(it.patientId ?? it.id ?? "").trim();
      if (pid) byPatientId.set(pid, it);
    }
    for (const p of patientsForAssign) {
      const did = p.deviceId?.trim();
      if (did) {
        m.set(did, { patientId: p.id, patientLabel: p.name });
      }
      const match = byPatientId.get(p.id);
      const serial = match ? String((match as { assignedDeviceSerial?: string }).assignedDeviceSerial ?? "").trim() : "";
      if (serial) m.set(serial, { patientId: p.id, patientLabel: p.name });
    }
    return m;
  }, [patientsForAssign, patientsListData?.items]);

  const rows: DeviceRow[] = useMemo(() => {
    const orgItemsSorted = sortRecordsNewestFirst([...(devicesData?.items ?? [])] as Record<string, unknown>[], [
      "createdAt",
      "lastActionAt",
    ]);
    const globalSlim = (unassignedData as { globalPool?: { id: string; serialNumber?: string }[] })?.globalPool ?? [];

    const orgTagged = orgItemsSorted.map((d) => {
      const did = String(d.id ?? "");
      const serial = deviceSerialFromRecord(d);
      const keys = [did, serial ?? ""].filter((x) => x.trim().length > 0);
      const merged = mergePatientFromAssignments(did, keys, patientInfoFromDevice(d, t("common.patient")), patientByDeviceId);
      return {
        row: {
          id: did,
          serialNumber: serial,
          patientId: merged.patientId,
          patientLabel: merged.patientLabel,
        } satisfies DeviceRow,
        ms: recordTimeMs(d.createdAt ?? d.lastActionAt),
        id: did,
      };
    });

    const seen = new Set(orgTagged.map((t) => t.id));
    const globalTagged = globalSlim
      .filter((d) => d.id && !seen.has(d.id))
      .map((d) => {
        const sn = String(d.serialNumber ?? "").trim() || null;
        const keys = [d.id, sn ?? ""].filter((x) => x.trim().length > 0);
        const merged = mergePatientFromAssignments(
          d.id,
          keys,
          { patientId: null, patientLabel: null },
          patientByDeviceId
        );
        return {
          row: {
            id: d.id,
            serialNumber: sn,
            patientId: merged.patientId,
            patientLabel: merged.patientLabel,
          } satisfies DeviceRow,
          ms: 0,
          id: d.id,
        };
      });

    return [...orgTagged, ...globalTagged]
      .sort((a, b) => (b.ms !== a.ms ? b.ms - a.ms : b.id.localeCompare(a.id, undefined, { numeric: true })))
      .map((x) => x.row);
  }, [devicesData, unassignedData, patientByDeviceId, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch = !q || rowSearchHaystack(row).includes(q);
      if (!matchesSearch) return false;
      if (assignmentFilter !== "all") {
        const hasPatient = row.patientId != null;
        const matchesAssignment =
          assignmentFilter === "unassigned" ? !hasPatient : hasPatient;
        if (!matchesAssignment) return false;
      }
      return true;
    });
  }, [rows, search, assignmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const hasActiveFilters = search.trim().length > 0 || assignmentFilter !== "all";
  const isEmpty = rows.length === 0;
  const hasNoResults = filtered.length === 0 && hasActiveFilters;

  const clearFilters = useCallback(() => {
    setSearch("");
    setAssignmentFilter("all");
    setPage(1);
  }, []);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("devices.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("devices.subtitle")}
        </p>
      </div>

      {/* Search and filters toolbar — same pattern as Caregivers */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("devices.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-9"
              aria-label={t("devices.searchAria")}
            />
            {search.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                aria-label={t("common.clearSearch")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t("common.assignment")}:</span>
            <Select
              value={assignmentFilter}
              onValueChange={(v) => {
                setAssignmentFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="unassigned">{t("common.unassignedFilter")}</SelectItem>
                <SelectItem value="assigned">{t("common.assignedFilter")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("common.clearFilters")}
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-2">
            {t("common.resultsFound", { count: filtered.length })}
          </p>
        )}
      </div>

      {isLoading && <LoadingCard message={t("devices.loading")} />}

      {!isLoading && isError && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive">{t("devices.loadFailed")}</p>
        </div>
      )}

      {!isLoading && !isError && isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <Monitor className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">{t("devices.empty")}</p>
        </div>
      )}

      {!isLoading && !isError && !isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("devices.noMatchTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("devices.noMatchDesc", {
              suffix: search.trim() ? t("devices.noMatchSuffix", { q: search.trim() }) : "",
            })}
          </p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            {t("common.clearFilters")}
          </Button>
        </div>
      )}

      <Dialog
        open={assignDeviceId != null}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDeviceId(null);
            setAssignPatientId(NONE_PATIENT);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("devices.assignDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("devices.assignDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          {assignablePatients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("devices.noPatientsToAssign")}
            </p>
          ) : (
            <div className="grid gap-2 py-2">
              <span className="text-sm font-medium text-foreground">{t("devices.patientLabel")}</span>
              <Select value={assignPatientId} onValueChange={setAssignPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("devices.selectPatientPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_PATIENT}>{t("devices.selectPatientItem")}</SelectItem>
                  {assignablePatients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDeviceId(null);
                setAssignPatientId(NONE_PATIENT);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={
                assignMutation.isPending ||
                !assignDeviceId ||
                assignPatientId === NONE_PATIENT ||
                assignablePatients.length === 0
              }
              onClick={() => {
                if (!assignDeviceId || assignPatientId === NONE_PATIENT) return;
                const p = assignablePatients.find((x) => x.id === assignPatientId);
                if (!p) return;
                assignMutation.mutate({
                  deviceId: assignDeviceId,
                  patientId: p.id,
                  patientName: p.name,
                });
              }}
            >
              {assignMutation.isPending ? t("common.assigning") : t("common.assign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={unassignTarget != null}
        onOpenChange={(open) => {
          if (!open && !unassignMutation.isPending) setUnassignTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("devices.unassignTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {unassignTarget ? (
                <>
                  {t("devices.unassignDesc", {
                    patient: unassignTarget.patientLabel,
                    device: unassignTarget.deviceId,
                  })}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unassignMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={unassignMutation.isPending || !unassignTarget}
              onClick={() => {
                if (unassignTarget) unassignMutation.mutate(unassignTarget.deviceId);
              }}
            >
              {unassignMutation.isPending ? t("common.unassigning") : t("common.unassign")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isLoading && !isError && !isEmpty && !hasNoResults && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("devices.colDevice")}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("devices.colPatient")}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">
                  {t("devices.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/devices/${row.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-card-foreground">
                          {(row.serialNumber && row.serialNumber !== row.id ? row.serialNumber : null) || row.id}
                        </span>
                        {row.serialNumber && row.serialNumber !== row.id ? (
                          <span className="block text-xs text-muted-foreground truncate" title={row.id}>
                            {t("common.idPrefix")} {row.id}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                    {row.patientId && row.patientLabel ? (
                      <Link
                        to={`/patients/${row.patientId}`}
                        className="font-medium text-primary hover:underline focus:outline-none focus:underline"
                      >
                        {row.patientLabel}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{t("common.dash")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {row.patientId && row.patientLabel ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={unassignMutation.isPending}
                        onClick={() =>
                          setUnassignTarget({ deviceId: row.id, patientLabel: row.patientLabel ?? t("common.patient") })
                        }
                      >
                        <UserMinus className="h-4 w-4 shrink-0" aria-hidden />
                        {t("common.unassign")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="info"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => {
                          setAssignDeviceId(row.id);
                          setAssignPatientId(NONE_PATIENT);
                        }}
                      >
                        <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                        {t("common.assign")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t("common.itemsPerPage")}</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("common.showingRange", { start: startItem, end: endItem, total: filtered.length })}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  {t("common.previous")}
                </Button>
                <span className="text-sm text-muted-foreground px-1">
                  {t("pagination.pageOf", { page: safePage, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  {t("common.next")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Devices;
