import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Users, Search, Monitor, Phone, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockDevices } from "@/data/mockData";
import { usePatients } from "@/contexts/PatientsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const Patients: React.FC = () => {
  const navigate = useNavigate();
  const { patients: addedPatients } = usePatients();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fromDevices = mockDevices.map((d) => ({
    id: d.id,
    name: d.patientName,
    deviceId: d.id,
    serialNumber: d.serialNumber,
    phone: undefined as string | undefined,
    email: undefined as string | undefined,
  }));
  const fromAdded = addedPatients.map((p) => ({
    id: p.id,
    name: p.fullName,
    deviceId: p.assignedDeviceId ?? undefined,
    serialNumber: p.assignedDeviceSerial,
    phone: p.phone || undefined,
    email: p.email || undefined,
  }));

  const all = [...fromDevices, ...fromAdded];

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
    [search, addedPatients]
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

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage patients and assigned devices
          </p>
        </div>
        <Button onClick={() => navigate("/patients/add")}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add patient
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, device, phone or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-9"
              aria-label="Search patients"
            />
            {search.length > 0 && (
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setPage(1); }} aria-label="Clear search">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-2">{filtered.length} result{filtered.length !== 1 ? "s" : ""} found</p>
        )}
      </div>

      {isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No patients yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">Add a patient to get started.</p>
          <Button className="mt-4" onClick={() => navigate("/patients/add")}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add patient
          </Button>
        </div>
      )}

      {!isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No matching patients</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or clear filters.</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
        </div>
      )}

      {!isEmpty && !hasNoResults && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
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
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {r.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {r.email}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {r.deviceId ? (
                      <span className="flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 shrink-0" />
                        {r.deviceId}
                        {r.serialNumber && <span className="text-xs">({r.serialNumber})</span>}
                      </span>
                    ) : (
                      "—"
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
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">Showing {startItem} to {endItem} of {filtered.length} results</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>Previous</Button>
                <span className="text-sm text-muted-foreground px-1">Page {safePage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
