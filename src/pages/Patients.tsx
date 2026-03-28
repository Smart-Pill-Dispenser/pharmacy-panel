import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { UserPlus, Users, Search, Monitor, Phone, Mail, X, UserMinus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePatients } from "@/contexts/PatientsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import { sortRecordsNewestFirst } from "@/lib/listSort";
import LoadingCard from "@/components/LoadingCard";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const Patients: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patients: addedPatients, removePatient: removeLocalPatient } = usePatients();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [unassignTarget, setUnassignTarget] = useState<{ deviceId: string; patientName: string } | null>(null);
  const [removePatientTarget, setRemovePatientTarget] = useState<{ id: string; name: string } | null>(null);

  const unassignMutation = useMutation({
    mutationFn: (deviceId: string) => pharmacyApi.unassignDevice(deviceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
      toast.success(t("patients.unassignToast"));
      setUnassignTarget(null);
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? t("patients.unassignFailed"));
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: (patientId: string) => pharmacyApi.deletePatient(patientId),
    onSuccess: async (_, patientId) => {
      removeLocalPatient(patientId);
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
      toast.success(t("patients.removedToast"));
      setRemovePatientTarget(null);
    },
    onError: (e: Error) => toast.error(e?.message ?? t("patients.removeFailed")),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pharmacy", "patients"],
    queryFn: () => pharmacyApi.listPatients({ limit: 5000 }),
    staleTime: 30_000,
  });

  const apiPatients = useMemo(() => {
    const items = (data?.items ?? []) as any[];
    const mapped = items
      .map((p) => ({
        id: String(p.patientId ?? p.id ?? ""),
        name: String(p.fullName ?? ""),
        deviceId: typeof p.assignedDeviceId === "string" ? p.assignedDeviceId : undefined,
        serialNumber: typeof p.assignedDeviceSerial === "string" ? p.assignedDeviceSerial : undefined,
        phone: typeof p.phone === "string" ? p.phone : undefined,
        email: typeof p.email === "string" ? p.email : undefined,
        createdAt: typeof p.createdAt === "string" ? p.createdAt : undefined,
      }))
      .filter((p) => p.id && p.name);
    return sortRecordsNewestFirst(mapped as Record<string, unknown>[], ["createdAt", "updatedAt"]) as typeof mapped;
  }, [data]);

  const apiPatientIds = useMemo(() => new Set(apiPatients.map((p) => p.id)), [apiPatients]);
  const fromAdded = addedPatients.map((p) => ({
    id: p.id,
    name: p.fullName,
    deviceId: p.assignedDeviceId ?? undefined,
    serialNumber: p.assignedDeviceSerial,
    phone: p.phone || undefined,
    email: p.email || undefined,
  }));

  const extraFromAdded = fromAdded.filter((p) => !apiPatientIds.has(p.id));
  const combinedPatients = [...apiPatients, ...extraFromAdded];
  const all = sortRecordsNewestFirst(combinedPatients as Record<string, unknown>[], ["createdAt", "updatedAt"]) as typeof combinedPatients;

  const filtered = useMemo(
    () =>
      all.filter(
        (r) =>
          r.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          (r.deviceId && r.deviceId.toLowerCase().includes(search.trim().toLowerCase())) ||
          (r.serialNumber && r.serialNumber.toLowerCase().includes(search.trim().toLowerCase())) ||
          (r.phone && r.phone.includes(search.trim())) ||
          (r.email && r.email.toLowerCase().includes(search.trim().toLowerCase()))
      ),
    [search, all]
  );

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

  const hasActiveFilters = search.trim().length > 0;
  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };
  const isEmpty = all.length === 0;
  const hasNoResults = filtered.length === 0 && hasActiveFilters;
  const dash = t("common.dash");

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("patients.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("patients.subtitle")}
          </p>
        </div>
        <Button onClick={() => navigate("/patients/add")}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("patients.addPatient")}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("patients.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-9"
              aria-label={t("patients.searchAria")}
            />
            {search.length > 0 && (
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setPage(1); }} aria-label={t("common.clearSearch")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>{t("common.clearFilters")}</Button>}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-2">
            {t("common.resultsFound", { count: filtered.length })}
          </p>
        )}
      </div>

      {isLoading && <LoadingCard message={t("patients.loading")} />}

      {!isLoading && isError && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive">{t("patients.loadFailed")}</p>
        </div>
      )}

      {!isLoading && !isError && isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("patients.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{t("patients.emptyHint")}</p>
          <Button className="mt-4" onClick={() => navigate("/patients/add")}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t("patients.addPatient")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && !isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("patients.noMatchTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("common.tryDifferentSearch")}</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>{t("common.clearFilters")}</Button>
        </div>
      )}

      <AlertDialog
        open={removePatientTarget != null}
        onOpenChange={(open) => {
          if (!open && !deletePatientMutation.isPending) setRemovePatientTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("patients.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {removePatientTarget ? (
                  <Trans
                    i18nKey="patients.removeDesc"
                    values={{ name: removePatientTarget.name }}
                    components={[<span className="font-medium text-foreground" key="0" />]}
                  />
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePatientMutation.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deletePatientMutation.isPending || !removePatientTarget}
              onClick={() => {
                if (removePatientTarget) deletePatientMutation.mutate(removePatientTarget.id);
              }}
            >
              {deletePatientMutation.isPending ? t("common.removing") : t("patients.removeSubmit")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={unassignTarget != null}
        onOpenChange={(open) => {
          if (!open && !unassignMutation.isPending) setUnassignTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("patients.unassignTitle")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {unassignTarget ? (
                  <Trans
                    i18nKey="patients.unassignDesc"
                    values={{ device: unassignTarget.deviceId, patient: unassignTarget.patientName }}
                    components={[
                      <span className="font-medium text-foreground" key="0" />,
                      <span className="font-medium text-foreground" key="1" />,
                    ]}
                  />
                ) : null}
              </div>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("patients.colPatient")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t("patients.colPhone")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t("patients.colEmail")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("patients.colDevice")}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">
                  {t("patients.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/patients/${r.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {r.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {r.phone}
                      </span>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {r.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {r.email}
                      </span>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    {r.deviceId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Monitor className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{r.deviceId}</span>
                          {r.serialNumber &&
                            r.serialNumber.trim() !== r.deviceId.trim() && (
                              <span className="text-xs shrink-0">({r.serialNumber})</span>
                            )}
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-8 gap-1 shrink-0"
                          disabled={unassignMutation.isPending}
                          onClick={() => setUnassignTarget({ deviceId: r.deviceId!, patientName: r.name })}
                        >
                          <UserMinus className="h-3.5 w-3.5" aria-hidden />
                          {t("common.unassign")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="info"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => navigate(`/patients/${encodeURIComponent(r.id)}/edit`)}
                      >
                        <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                        {t("patients.assign")}
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary"
                        title={t("common.editPatient")}
                        aria-label={t("common.editPatient")}
                        onClick={() => navigate(`/patients/${encodeURIComponent(r.id)}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deletePatientMutation.isPending}
                        title={t("common.removePatient")}
                        aria-label={t("common.removePatient")}
                        onClick={() => setRemovePatientTarget({ id: r.id, name: r.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t("common.itemsPerPage")}</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("common.showingRange", { start: startItem, end: endItem, total: filtered.length })}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
                  {t("common.previous")}
                </Button>
                <span className="text-sm text-muted-foreground px-1">
                  {t("pagination.pageOf", { page: safePage, total: totalPages })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
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

export default Patients;
