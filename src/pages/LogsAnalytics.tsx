import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Calendar, Clock, Filter, Package, AlertTriangle, StopCircle, Play, HelpCircle, Search, X, ChevronDown, Check } from "lucide-react";
import type { ActivityLog, Device } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import { sortRecordsNewestFirst } from "@/lib/listSort";
import LoadingCard from "@/components/LoadingCard";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function parseLogDate(ts: string): Date {
  const [datePart] = ts.split(" ");
  return new Date(datePart + "T00:00:00");
}

function formatLogsLogTypeLabel(t: (k: string, o?: { defaultValue?: string }) => string, type: string): string {
  const human = type.replace(/_/g, " ");
  return t(`deviceDetail.logTypes.${type}`, { defaultValue: human });
}

const LogsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const typeOptions = useMemo(
    () => [
      { value: "all", label: t("logs.typeAll") },
      { value: "dispense", label: t("logs.typeDispense") },
      { value: "refill", label: t("logs.typeRefill") },
      { value: "error", label: t("logs.typeError") },
      { value: "stop", label: t("logs.typeStop") },
      { value: "start", label: t("logs.typeStart") },
      { value: "help", label: t("logs.typeHelp") },
    ],
    [t]
  );
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);

  const { data: logsData, isLoading: logsLoading, isError: logsError } = useQuery({
    queryKey: ["pharmacy", "logs"],
    queryFn: () => pharmacyApi.listLogs({ limit: 200 }),
    staleTime: 30_000,
  });

  const { data: devicesData, isLoading: devicesLoading, isError: devicesError } = useQuery({
    queryKey: ["pharmacy", "devices", "for-logs"],
    queryFn: () => pharmacyApi.getDevices(),
    staleTime: 30_000,
  });

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    const raw = logsData?.items ?? [];
    const sorted = sortRecordsNewestFirst([...raw] as Record<string, unknown>[], ["timestamp"]);
    setLogs(sorted as ActivityLog[]);
  }, [logsData]);

  useEffect(() => {
    const raw = devicesData?.items ?? [];
    const sorted = sortRecordsNewestFirst([...raw] as Record<string, unknown>[], ["createdAt", "lastActionAt"]);
    setDevices(sorted as Device[]);
  }, [devicesData]);

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const q = search.trim().toLowerCase();
        if (q && !log.description.toLowerCase().includes(q) && !log.deviceId.toLowerCase().includes(q) && !log.type.toLowerCase().includes(q) && !log.timestamp.includes(q)) return false;
        if (typeFilter !== "all" && log.type !== typeFilter) return false;
        if (deviceFilter !== "all" && log.deviceId !== deviceFilter) return false;
        const logDate = parseLogDate(log.timestamp);
        if (dateFrom && logDate < new Date(dateFrom + "T00:00:00")) return false;
        if (dateTo && logDate > new Date(dateTo + "T23:59:59")) return false;
        return true;
      }),
    [logs, search, typeFilter, deviceFilter, dateFrom, dateTo]
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

  const hasActiveFilters = search.trim().length > 0 || typeFilter !== "all" || deviceFilter !== "all" || dateFrom || dateTo;
  const clearFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setDeviceFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);
  const isEmpty = logs.length === 0;
  const hasNoResults = filtered.length === 0 && hasActiveFilters;
  const allDevicesLabel = t("logs.allDevices");

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
        <h1 className="text-2xl font-bold text-foreground">{t("logs.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("logs.subtitle")}</p>
      </div>

      {/* Search and filters toolbar - same as admin */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("logs.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-9"
              aria-label={t("logs.searchAria")}
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
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t("logs.filterTypeLabel")}</span>
            <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={typeDropdownOpen}
                  className="w-[160px] justify-between font-normal"
                >
                  {TYPE_OPTIONS.find((t) => t.value === typeFilter)?.label ?? "Type"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search types..." />
                  <CommandList>
                    <CommandEmpty>No type found.</CommandEmpty>
                    <CommandGroup>
                      {TYPE_OPTIONS.map((opt) => (
                        <CommandItem
                          key={opt.value}
                          value={opt.label}
                          onSelect={() => {
                            setTypeFilter(opt.value);
                            setPage(1);
                            setTypeDropdownOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", typeFilter === opt.value ? "opacity-100" : "opacity-0")} />
                          {opt.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t("logs.filterDeviceLabel")}</span>
            <Popover open={deviceDropdownOpen} onOpenChange={setDeviceDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={deviceDropdownOpen}
                  className="w-[160px] justify-between font-normal"
                >
                  {deviceFilter === "all" ? allDevicesLabel : deviceFilter}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("logs.deviceSearchPlaceholder")} />
                  <CommandList>
                    <CommandEmpty>{t("logs.noDeviceFound")}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value={allDevicesLabel}
                        onSelect={() => {
                          setDeviceFilter("all");
                          setPage(1);
                          setDeviceDropdownOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", deviceFilter === "all" ? "opacity-100" : "opacity-0")} />
                        {allDevicesLabel}
                      </CommandItem>
                      {devices.map((d) => (
                        <CommandItem
                          key={d.id}
                          value={d.id}
                          onSelect={() => {
                            setDeviceFilter(d.id);
                            setPage(1);
                            setDeviceDropdownOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", deviceFilter === d.id ? "opacity-100" : "opacity-0")} />
                          {d.id}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <DateInput
              className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label={t("common.fromDate")}
            />
            <span className="text-muted-foreground text-sm shrink-0">–</span>
            <DateInput
              className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label={t("common.toDate")}
            />
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

      {(logsLoading || devicesLoading) && <LoadingCard message={t("logs.loading")} />}

      {isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("logs.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {t("logs.emptyHint")}
          </p>
        </div>
      )}

      {!isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("logs.noMatchTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("common.tryDifferentSearch")}</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            {t("common.clearFilters")}
          </Button>
        </div>
      )}

      {!isEmpty && !hasNoResults && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("logs.colType")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("logs.colDevice")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("logs.colDescription")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t("logs.colTimestamp")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${logTypeBg[log.type] ?? "bg-muted"}`}>
                        {logTypeIcons[log.type]}
                      </div>
                      <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                        {formatLogsLogTypeLabel(t, log.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-card-foreground">{log.deviceId}</td>
                  <td className="px-4 py-3 text-sm text-card-foreground">{log.description}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {log.timestamp}
                    </div>
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
                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
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

export default LogsAnalytics;
