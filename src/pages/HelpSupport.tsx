import React, { useState, useCallback, useMemo, useEffect } from "react";
import { HelpCircle, Search, Filter, Calendar, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { mockHelpRequests } from "@/data/mockData";
import type { HelpRequest } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function parseHelpDate(ts: string): Date {
  const [datePart] = ts.split(" ");
  return new Date(datePart + "T00:00:00");
}

const HelpSupport: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [requests, setRequests] = useState(mockHelpRequests);
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; req: HelpRequest | null }>({ open: false, req: null });
  const [resolveIssue, setResolveIssue] = useState("");
  const [resolveReason, setResolveReason] = useState("");

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        const q = search.trim().toLowerCase();
        if (q && !r.patientName.toLowerCase().includes(q) && !r.deviceId.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        const logDate = parseHelpDate(r.timestamp);
        if (dateFrom && logDate < new Date(dateFrom + "T00:00:00")) return false;
        if (dateTo && logDate > new Date(dateTo + "T23:59:59")) return false;
        return true;
      }),
    [requests, search, statusFilter, dateFrom, dateTo]
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

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all" || dateFrom || dateTo;
  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);
  const isEmpty = requests.length === 0;
  const hasNoResults = filtered.length === 0 && hasActiveFilters;

  const openResolveDialog = (req: HelpRequest) => {
    setResolveDialog({ open: true, req });
    setResolveIssue(req.description);
    setResolveReason("");
  };

  const closeResolveDialog = () => {
    setResolveDialog({ open: false, req: null });
    setResolveIssue("");
    setResolveReason("");
  };

  const handleResolveSubmit = () => {
    if (!resolveDialog.req) return;
    const id = resolveDialog.req.id;
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "resolved" as const, resolutionReason: resolveReason.trim() || undefined }
          : r
      )
    );
    closeResolveDialog();
    toast.success("Help request resolved", {
      description: resolveReason.trim() ? "Resolution reason saved." : undefined,
    });
  };

  const handleResolve = (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (req) openResolveDialog(req);
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage help requests from devices</p>
      </div>

      {/* Search and filters toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by request ID, device, or patient..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-9"
              aria-label="Search help requests"
            />
            {search.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1); }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input type="date" className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} aria-label="From date" />
            <span className="text-muted-foreground text-sm shrink-0">–</span>
            <Input type="date" className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} aria-label="To date" />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-2">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No help requests yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Help requests from devices will appear here when submitted.
          </p>
        </div>
      )}

      {!isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No matching requests</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or clear filters.</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {!isEmpty && !hasNoResults && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Request ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((req) => (
                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{req.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-card-foreground">{req.deviceId}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{req.patientName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{req.timestamp}</td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {req.status !== "resolved" && (
                      <Button variant="outline" size="sm" onClick={() => handleResolve(req.id)}>
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {startItem} to {endItem} of {filtered.length} results
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-1">Page {safePage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={resolveDialog.open} onOpenChange={(open) => !open && closeResolveDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve issue</DialogTitle>
            <DialogDescription>
              Describe what the issue was and how you resolved it. This will be saved with the request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>What was the issue?</Label>
              <Textarea
                value={resolveIssue}
                onChange={(e) => setResolveIssue(e.target.value)}
                placeholder="Brief description of the issue reported..."
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>How did you resolve it?</Label>
              <Textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder="e.g. Cleared pouch path, restarted device, contacted patient..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeResolveDialog}>Cancel</Button>
            <Button onClick={handleResolveSubmit}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpSupport;
