import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Users, Search, Eye, Filter, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StatusBadge from "@/components/StatusBadge";
import type { Caregiver } from "@/data/mockData";
import { pharmacyApi } from "@/api/pharmacy";
import { sortRecordsNewestFirst } from "@/lib/listSort";
import { caregiverFromApiRow, formatCaregiverDateTime } from "@/lib/caregiverFromApi";
import LoadingCard from "@/components/LoadingCard";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const Caregivers: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [removeTarget, setRemoveTarget] = useState<Caregiver | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pharmacy", "caregivers"],
    queryFn: () => pharmacyApi.listCaregivers({ limit: 500 }),
    staleTime: 30_000,
  });

  useEffect(() => {
    const sorted = sortRecordsNewestFirst([...(data?.items ?? [])] as Record<string, unknown>[], ["createdAt", "updatedAt"]);
    setCaregivers(sorted.map((row) => caregiverFromApiRow(row as Record<string, unknown>)));
  }, [data]);

  const filtered = useMemo(
    () => {
      const q = search.trim().toLowerCase();
      let list = caregivers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(search.trim()) ||
          (c.organizationId ?? "").toLowerCase().includes(q)
      );
      if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
      return list;
    },
    [caregivers, search, statusFilter]
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

  const updateCaregiverStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      pharmacyApi.updateCaregiverStatus(id, { isActive }),
    onMutate: ({ id, isActive }) => {
      setCaregivers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: isActive ? "active" : "inactive" } : c))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "caregivers"] });
      toast.success(t("caregivers.statusUpdated"));
    },
    onError: (e: any) => {
      toast.error(e?.message ?? t("caregivers.statusFailed"));
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "caregivers"] });
    },
  });

  const deleteCaregiver = useMutation({
    mutationFn: (id: string) => pharmacyApi.deleteCaregiver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "caregivers"] });
      toast.success(t("caregivers.removed"));
      setRemoveTarget(null);
    },
    onError: (e: Error) => toast.error(e?.message ?? t("caregivers.removeFailed")),
  });

  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";
  const isEmpty = caregivers.length === 0;
  const hasNoResults = filtered.length === 0 && (search.trim().length > 0 || statusFilter !== "all");
  const dash = t("common.dash");

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }, []);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("caregivers.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("caregivers.subtitle")}
        </p>
      </div>

      {/* Search and filters toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("caregivers.searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-9"
              aria-label={t("caregivers.searchAria")}
            />
            {search.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1); }}
                aria-label={t("common.clearSearch")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t("caregivers.statusLabel")}</span>
            <Select
              value={statusFilter}
              onValueChange={(v: "all" | "active" | "inactive") => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
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

      {isLoading && <LoadingCard message={t("caregivers.loading")} />}

      {!isLoading && isError && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-destructive">{t("caregivers.loadFailed")}</p>
        </div>
      )}

      {!isLoading && !isError && isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("caregivers.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {t("caregivers.emptyHint")}
          </p>
        </div>
      )}

      {!isLoading && !isError && !isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("caregivers.noMatchTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("caregivers.noMatchFor", { q: search.trim() })}</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            {t("common.clearFilters")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && !isEmpty && !hasNoResults && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/50 hover:bg-transparent">
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("caregivers.colId")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("caregivers.colName")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("caregivers.colEmail")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t("caregivers.colPhone")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t("caregivers.colLinked")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">{t("caregivers.colUpdated")}</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("caregivers.colStatus")}</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("caregivers.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {paginated.map((caregiver) => (
                <TableRow
                  key={caregiver.id}
                  className="hover:bg-muted/30 border-b-0 cursor-pointer transition-colors"
                  onClick={() => navigate(`/caregivers/${caregiver.id}`, { state: { caregiver } })}
                >
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {caregiver.id}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{caregiver.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {caregiver.email}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {caregiver.phone || dash}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {caregiver.linkedDevices.length > 0
                      ? t("caregivers.devicesCount", { count: caregiver.linkedDevices.length })
                      : dash}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                    {formatCaregiverDateTime(caregiver.updatedAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={caregiver.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/caregivers/${caregiver.id}`, { state: { caregiver } })}
                        aria-label={t("common.viewDetails")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={caregiver.status === "active"}
                        disabled={updateCaregiverStatus.isPending}
                        onCheckedChange={(checked) =>
                          updateCaregiverStatus.mutate({ id: caregiver.id, isActive: checked })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title={t("caregivers.removeTitle")}
                        aria-label={t("caregivers.removeTitle")}
                        disabled={deleteCaregiver.isPending}
                        onClick={() => setRemoveTarget(caregiver)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <AlertDialog open={removeTarget != null} onOpenChange={(o) => !o && !deleteCaregiver.isPending && setRemoveTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("caregivers.removeTitle")}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    {removeTarget ? (
                      <Trans
                        i18nKey="caregivers.removeDesc"
                        values={{ name: removeTarget.name, id: removeTarget.id }}
                        components={[<span className="font-medium text-foreground" key="0" />]}
                      />
                    ) : null}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteCaregiver.isPending}>{t("common.cancel")}</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleteCaregiver.isPending || !removeTarget}
                  onClick={() => removeTarget && deleteCaregiver.mutate(removeTarget.id)}
                >
                  {deleteCaregiver.isPending ? t("common.removing") : t("caregivers.removeSubmit")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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

export default Caregivers;
