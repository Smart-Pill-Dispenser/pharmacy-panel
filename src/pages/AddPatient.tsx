import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Pill,
  FileText,
  Monitor,
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  Cpu,
  Calendar,
  CalendarDays,
  Clock,
  Repeat,
  Upload,
  FileCheck,
  MapPin,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type Patient, type PatientMedication } from "@/data/mockData";
import { usePatients } from "@/contexts/PatientsContext";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import LoadingCard from "@/components/LoadingCard";

const STEPS = [
  { id: 1, title: "Basic information", icon: User },
  { id: 2, title: "Medication schedule", icon: Pill },
  { id: 3, title: "Prescription", icon: FileText },
  { id: 4, title: "Assign device", icon: Monitor },
];

/** Inclusive list of YYYY-MM-DD between start and end (local calendar). */
function datesInRange(start: string, end: string): string[] {
  if (!start?.trim() || !end?.trim() || start > end) return [];
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let t = new Date(sy, sm - 1, sd).getTime();
  const endT = new Date(ey, em - 1, ed).getTime();
  while (t <= endT) {
    const d = new Date(t);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
    t += 86400000;
  }
  return out;
}

function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.map((t) => t.trim()).filter(Boolean))].sort();
}

function datesValid(start: string, end: string): boolean {
  if (!start.trim() || !end.trim()) return false;
  return start <= end;
}

/** Today's calendar date in local time as YYYY-MM-DD (for `input[type=date]` min). */
function todayIsoDateLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Later of two YYYY-MM-DD strings (both optional); prefers defined value. */
function laterIsoDate(a: string, b: string): string | undefined {
  const at = a?.trim();
  const bt = b?.trim();
  if (!at && !bt) return undefined;
  if (!at) return bt;
  if (!bt) return at;
  return at > bt ? at : bt;
}

function timesSignature(times: string[]): string {
  return JSON.stringify(normalizeTimes(times));
}

type ScheduleTimesMode = "same" | "custom";

type ScheduledMedicationForm = {
  name: string;
  dosage: string;
  instructions: string;
  scheduleStart: string;
  scheduleEnd: string;
  /** Until set, template + per-date UIs stay hidden */
  scheduleMode: ScheduleTimesMode | null;
  /** Template: same schedule + seed for custom / new days in range */
  defaultTimesTemplate: string[];
  /** Each calendar day in range → exact 24h dispense times */
  byDate: Record<string, string[]>;
};

function createEmptyMedication(): ScheduledMedicationForm {
  return {
    name: "",
    dosage: "",
    instructions: "",
    scheduleStart: "",
    scheduleEnd: "",
    scheduleMode: null,
    defaultTimesTemplate: ["09:00"],
    byDate: {},
  };
}

/** Apply normalized template to every day in range (for same-schedule UX). */
function byDateFromTemplateAcrossRange(
  m: ScheduledMedicationForm,
  template: string[]
): Record<string, string[]> {
  if (!datesValid(m.scheduleStart, m.scheduleEnd)) return { ...m.byDate };
  const days = datesInRange(m.scheduleStart, m.scheduleEnd);
  const tmpl = normalizeTimes(template);
  const byDate = { ...m.byDate };
  for (const d of days) {
    byDate[d] = tmpl.length ? [...tmpl] : [];
  }
  return byDate;
}

function rebuildByDate(
  prevByDate: Record<string, string[]>,
  template: string[],
  start: string,
  end: string
): Record<string, string[]> {
  const days = datesInRange(start, end);
  const tmpl = normalizeTimes(template);
  const fill = tmpl.length ? tmpl : [];
  const next: Record<string, string[]> = {};
  for (const day of days) {
    if (prevByDate[day] !== undefined) {
      next[day] = [...prevByDate[day]];
    } else {
      next[day] = [...fill];
    }
  }
  return next;
}

function scheduleComplete(m: ScheduledMedicationForm): boolean {
  if (m.scheduleMode == null) return false;
  if (!datesValid(m.scheduleStart, m.scheduleEnd)) return false;
  const days = datesInRange(m.scheduleStart, m.scheduleEnd);
  if (days.length === 0) return false;
  return days.every((d) => (m.byDate[d] ?? []).some((t) => t.trim() !== ""));
}

function toPatientMedication(m: ScheduledMedicationForm): PatientMedication {
  const days = datesInRange(m.scheduleStart, m.scheduleEnd);
  const byDate: Record<string, string[]> = {};
  for (const d of days) {
    byDate[d] = normalizeTimes(m.byDate[d] ?? []);
  }
  const totalSlots = Object.values(byDate).reduce((n, arr) => n + arr.length, 0);
  return {
    name: m.name.trim(),
    dosage: m.dosage.trim(),
    instructions: m.instructions.trim() || undefined,
    frequency: `${m.scheduleStart} → ${m.scheduleEnd} · ${days.length} day(s) · ${totalSlots} dispense(s)`,
    schedule: {
      startDate: m.scheduleStart,
      endDate: m.scheduleEnd,
      byDate,
    },
  };
}

function formatDateLong(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ScheduleHandlers = {
  medication: ScheduledMedicationForm;
  updateMedication: (patch: Partial<ScheduledMedicationForm>) => void;
  setScheduleMode: (mode: ScheduleTimesMode) => void;
  setScheduleBoundary: (field: "scheduleStart" | "scheduleEnd", value: string) => void;
  addTemplateTime: () => void;
  setTemplateTimeAt: (ti: number, value: string) => void;
  removeTemplateTime: (ti: number) => void;
  addDateTime: (date: string) => void;
  setDateTimeAt: (date: string, ti: number, value: string) => void;
  removeDateTime: (date: string, ti: number) => void;
};

function IconHeading({
  icon: Icon,
  title,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone?: "primary" | "info";
}) {
  const tile =
    tone === "info"
      ? "border border-info/20 bg-info/10 text-info"
      : "border border-primary/20 bg-primary/10 text-primary";
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm", tile)}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-semibold tracking-tight text-foreground">{title}</span>
    </div>
  );
}

function SingleMedicationScheduleFields({
  medication: med,
  updateMedication,
  setScheduleMode,
  setScheduleBoundary,
  addTemplateTime,
  setTemplateTimeAt,
  removeTemplateTime,
  addDateTime,
  setDateTimeAt,
  removeDateTime,
}: ScheduleHandlers) {
  const todayMin = todayIsoDateLocal();
  const rangeOk = datesValid(med.scheduleStart, med.scheduleEnd);
  const days = rangeOk ? datesInRange(med.scheduleStart, med.scheduleEnd) : [];
  const tmplSig = timesSignature(med.defaultTimesTemplate);
  const endDateMin = laterIsoDate(med.scheduleStart, todayMin) ?? todayMin;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevated">
      <div className="h-1 w-full gradient-primary" aria-hidden />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Medication schedule</h2>
          <p className="text-sm text-muted-foreground">
            Add drug details, pick the regimen window, then choose how dispense times apply across those days.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-gradient-to-b from-muted/35 via-card to-card p-4 shadow-sm sm:p-5">
          <IconHeading icon={Pill} title="Medicine information" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Medication name *</Label>
              <Input
                value={med.name}
                onChange={(e) => updateMedication({ name: e.target.value })}
                placeholder="e.g. Metformin"
                className="border-border/80 bg-background shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dosage</Label>
              <Input
                value={med.dosage}
                onChange={(e) => updateMedication({ dosage: e.target.value })}
                placeholder="e.g. 500mg"
                className="border-border/80 bg-background shadow-sm"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Instructions (optional)</Label>
              <Textarea
                value={med.instructions}
                onChange={(e) => updateMedication({ instructions: e.target.value })}
                placeholder="e.g. Take with food"
                rows={2}
                className="resize-none min-h-[72px] border-border/80 bg-background shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-gradient-to-b from-muted/35 via-card to-card p-4 shadow-sm sm:p-5">
          <IconHeading icon={Calendar} title="Schedule period" />
          <p className="text-xs text-muted-foreground">
            Choose the first and last calendar day of this regimen. All days in between appear below.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sched-start-med">Start date *</Label>
              <DateInput
                id="sched-start-med"
                className="pr-9 min-w-0 border-border/80 bg-background shadow-sm"
                value={med.scheduleStart}
                min={todayMin}
                onChange={(e) => setScheduleBoundary("scheduleStart", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-end-med">End date *</Label>
              <DateInput
                id="sched-end-med"
                className="pr-9 min-w-0 border-border/80 bg-background shadow-sm"
                value={med.scheduleEnd}
                min={endDateMin}
                onChange={(e) => setScheduleBoundary("scheduleEnd", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/25 p-4 shadow-sm sm:p-5">
          <IconHeading icon={Clock} title="Dispense times" />
          <p className="text-xs text-muted-foreground">
            Pick a mode. <span className="font-medium text-primary">Same schedule</span> repeats one pattern;
            <span className="font-medium text-info"> custom</span> sets times per calendar day.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setScheduleMode("same")}
              className={cn(
                "group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-0",
                med.scheduleMode === "same"
                  ? "border-primary bg-primary/[0.08] shadow-sm"
                  : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              {med.scheduleMode === "same" ? (
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
              ) : null}
              <div className="flex items-start gap-3 pr-8">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all",
                    med.scheduleMode === "same"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                  )}
                >
                  <Repeat className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="font-semibold text-foreground">Same schedule</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    One list of times — applied to every day in your date range.
                  </p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode("custom")}
              className={cn(
                "group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 focus-visible:ring-offset-0",
                med.scheduleMode === "custom"
                  ? "border-info bg-info/[0.08] shadow-sm"
                  : "border-border/70 bg-card hover:border-info/45 hover:bg-muted/40"
              )}
            >
              {med.scheduleMode === "custom" ? (
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-info text-info-foreground shadow-md">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
              ) : null}
              <div className="flex items-start gap-3 pr-8">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all",
                    med.scheduleMode === "custom"
                      ? "bg-info text-info-foreground shadow-md"
                      : "bg-muted text-muted-foreground group-hover:bg-info/20 group-hover:text-info"
                  )}
                >
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="font-semibold text-foreground">Custom schedule</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Set different dispense times for each date in the list below.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {med.scheduleMode === "same" && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-primary/[0.05] p-4 shadow-sm sm:p-5">
            <IconHeading icon={Clock} title="Default dispense times (24h)" />
            <p className="text-xs text-muted-foreground">
              These times apply to every day in range and stay in sync automatically — no extra action needed.
            </p>
            <div className="space-y-2 rounded-lg bg-muted/40 p-3 sm:p-4">
              <Label className="text-xs font-medium text-primary">Template times</Label>
              <ul className="space-y-2">
                {med.defaultTimesTemplate.map((t, ti) => (
                  <li key={ti} className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="h-9 w-full max-w-[140px] border-border/80 bg-background shadow-sm"
                      value={t}
                      onChange={(e) => setTemplateTimeAt(ti, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeTemplateTime(ti)}
                      aria-label="Remove template time"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 border border-border/70 shadow-sm"
                  onClick={addTemplateTime}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add time
                </Button>
              </div>
            </div>
          </div>
        )}

        {med.scheduleMode === "custom" && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-info/[0.04] p-4 shadow-sm sm:p-5">
            <IconHeading icon={CalendarDays} title="Calendar — exact dispense per date" tone="info" />
            {!rangeOk ? (
              <p className="text-sm text-muted-foreground">Set a valid start and end date to see all days.</p>
            ) : days.length === 0 ? (
              <p className="text-sm text-muted-foreground">No days in range.</p>
            ) : (
              <div className="max-h-[min(420px,50vh)] overflow-y-auto rounded-lg border border-border/60 bg-card divide-y divide-border/60">
                {days.map((date) => {
                  const times = med.byDate[date] ?? [];
                  const normalized = normalizeTimes(times);
                  const matchesTemplate = normalized.length > 0 && timesSignature(normalized) === tmplSig;
                  return (
                    <div key={date} className="p-3 sm:p-4 space-y-2 bg-card/80">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-semibold text-foreground">{formatDateLong(date)}</span>
                          <span className="text-xs text-muted-foreground block">{date}</span>
                        </div>
                        {normalized.length === 0 ? (
                          <span className="text-[10px] uppercase tracking-wide font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            No times
                          </span>
                        ) : matchesTemplate ? (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Same as template
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Custom times
                          </span>
                        )}
                      </div>
                      {times.length === 0 ? (
                        <p className="text-xs text-destructive">Add at least one dispense time for this date.</p>
                      ) : (
                        <ul className="space-y-2">
                          {times.map((t, ti) => (
                            <li key={ti} className="flex items-center gap-2">
                              <Input
                                type="time"
                                className="h-9 flex-1 max-w-[160px] border-border/80 bg-background shadow-sm"
                                value={t}
                                onChange={(e) => setDateTimeAt(date, ti, e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeDateTime(date, ti)}
                                aria-label="Remove dispense time"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => addDateTime(date)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add dispense time
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const AddPatient: React.FC = () => {
  const navigate = useNavigate();
  const { addPatient, patients: addedPatients } = usePatients();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");

  const [medication, setMedication] = useState<ScheduledMedicationForm>(() => createEmptyMedication());
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionFileName, setPrescriptionFileName] = useState("");
  const [prescriptionDragActive, setPrescriptionDragActive] = useState(false);
  const prescriptionFileInputRef = useRef<HTMLInputElement>(null);
  const [assignedDeviceId, setAssignedDeviceId] = useState<string>("");
  const [assignedDeviceSerial, setAssignedDeviceSerial] = useState<string>("");

  const { data: unassignedResp, isLoading: unassignedLoading } = useQuery({
    queryKey: ["pharmacy", "devices", "unassigned"],
    queryFn: () => pharmacyApi.getUnassignedDevices(),
    staleTime: 30_000,
  });

  const { data: patientsListForDevices } = useQuery({
    queryKey: ["pharmacy", "patients"],
    queryFn: () => pharmacyApi.listPatients({ limit: 5000 }),
    staleTime: 30_000,
  });

  const deviceIdsAlreadyLinked = React.useMemo(() => {
    const s = new Set<string>();
    const items = (patientsListForDevices?.items ?? []) as Record<string, unknown>[];
    for (const p of items) {
      const aid = p.assignedDeviceId;
      if (typeof aid === "string" && aid.trim()) s.add(aid.trim());
    }
    for (const p of addedPatients) {
      if (p.assignedDeviceId?.trim()) s.add(p.assignedDeviceId.trim());
    }
    return s;
  }, [patientsListForDevices?.items, addedPatients]);

  const unassignedDevices = React.useMemo(() => {
    const raw = (unassignedResp?.items ?? []) as Array<{ id: string; serialNumber: string }>;
    return raw.filter((d) => !deviceIdsAlreadyLinked.has(d.id.trim()));
  }, [unassignedResp?.items, deviceIdsAlreadyLinked]);
  const [submitting, setSubmitting] = useState(false);

  const updateMedication = (patch: Partial<ScheduledMedicationForm>) => {
    setMedication((m) => ({ ...m, ...patch }));
  };

  const setScheduleMode = (mode: ScheduleTimesMode) => {
    setMedication((m) => {
      if (mode === "same" && datesValid(m.scheduleStart, m.scheduleEnd)) {
        return {
          ...m,
          scheduleMode: mode,
          byDate: byDateFromTemplateAcrossRange(m, m.defaultTimesTemplate),
        };
      }
      return { ...m, scheduleMode: mode };
    });
  };

  const setScheduleBoundary = (field: "scheduleStart" | "scheduleEnd", value: string) => {
    setMedication((m) => {
      const todayMin = todayIsoDateLocal();
      let scheduleStart = field === "scheduleStart" ? value : m.scheduleStart;
      let scheduleEnd = field === "scheduleEnd" ? value : m.scheduleEnd;
      if (scheduleStart.trim() && scheduleStart < todayMin) {
        scheduleStart = todayMin;
      }
      if (scheduleEnd.trim() && scheduleEnd < todayMin) {
        scheduleEnd = todayMin;
      }
      if (scheduleStart.trim() && scheduleEnd.trim() && scheduleStart > scheduleEnd) {
        scheduleEnd = scheduleStart;
      }
      if (!datesValid(scheduleStart, scheduleEnd)) {
        return { ...m, scheduleStart, scheduleEnd };
      }
      let byDate = rebuildByDate(m.byDate, m.defaultTimesTemplate, scheduleStart, scheduleEnd);
      if (m.scheduleMode === "same") {
        byDate = byDateFromTemplateAcrossRange(
          { ...m, scheduleStart, scheduleEnd, byDate },
          m.defaultTimesTemplate
        );
      }
      return { ...m, scheduleStart, scheduleEnd, byDate };
    });
  };

  const addTemplateTime = () => {
    setMedication((m) => {
      const next = [...m.defaultTimesTemplate, "12:00"];
      const updated = { ...m, defaultTimesTemplate: next };
      if (m.scheduleMode === "same") {
        return { ...updated, byDate: byDateFromTemplateAcrossRange(updated, next) };
      }
      return updated;
    });
  };

  const setTemplateTimeAt = (ti: number, value: string) => {
    setMedication((m) => {
      const next = [...m.defaultTimesTemplate];
      next[ti] = value;
      const updated = { ...m, defaultTimesTemplate: next };
      if (m.scheduleMode === "same") {
        return { ...updated, byDate: byDateFromTemplateAcrossRange(updated, next) };
      }
      return updated;
    });
  };

  const removeTemplateTime = (ti: number) => {
    setMedication((m) => {
      const next = m.defaultTimesTemplate.filter((_, j) => j !== ti);
      const tmpl = next.length ? next : ["09:00"];
      const updated = { ...m, defaultTimesTemplate: tmpl };
      if (m.scheduleMode === "same") {
        return { ...updated, byDate: byDateFromTemplateAcrossRange(updated, tmpl) };
      }
      return updated;
    });
  };

  const addDateTime = (date: string) => {
    setMedication((m) => {
      const cur = m.byDate[date] ?? [];
      return { ...m, byDate: { ...m.byDate, [date]: [...cur, "09:00"] } };
    });
  };

  const setDateTimeAt = (date: string, ti: number, value: string) => {
    setMedication((m) => {
      const cur = [...(m.byDate[date] ?? [])];
      cur[ti] = value;
      return { ...m, byDate: { ...m.byDate, [date]: cur } };
    });
  };

  const removeDateTime = (date: string, ti: number) => {
    setMedication((m) => {
      const cur = (m.byDate[date] ?? []).filter((_, j) => j !== ti);
      return { ...m, byDate: { ...m.byDate, [date]: cur } };
    });
  };

  const acceptPrescriptionFile = (file: File | undefined) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const ok =
      name.endsWith(".pdf") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png");
    if (!ok) {
      toast.error("Use a PDF or image (JPG, PNG).");
      return;
    }
    setPrescriptionFileName(file.name);
  };

  const clearPrescriptionFile = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setPrescriptionFileName("");
    if (prescriptionFileInputRef.current) prescriptionFileInputRef.current.value = "";
  };

  const openPrescriptionFilePicker = () => prescriptionFileInputRef.current?.click();

  const canProceedStep1 = fullName.trim() && phone.trim();
  const canProceedStep2 = !!medication.name.trim() && scheduleComplete(medication);
  const canProceedStep3 = true;
  const canProceedStep4 = !!assignedDeviceId;

  const handleAssignDevice = (deviceRowId: string) => {
    const dev = unassignedDevices.find((d) => d.id === deviceRowId);
    setAssignedDeviceId(deviceRowId);
    const sn = dev?.serialNumber?.trim();
    setAssignedDeviceSerial(sn && sn !== deviceRowId.trim() ? sn : "");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const validMeds = [toPatientMedication(medication)];
    try {
      const body = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        address: address.trim() || undefined,
        medications: validMeds,
        prescriptionNotes: prescriptionNotes.trim() || undefined,
        prescriptionFileName: prescriptionFileName || undefined,
        assignedDeviceId: assignedDeviceId || undefined,
        assignedDeviceSerial: assignedDeviceSerial || undefined,
      };

      const resp = await pharmacyApi.createPatient(body);
      const created = (resp?.item ?? resp) as any;

      const patient: Patient = {
        id: created.patientId ?? created.id,
        fullName: created.fullName ?? body.fullName,
        phone: created.phone ?? body.phone,
        email: created.email ?? body.email ?? undefined,
        dateOfBirth: created.dateOfBirth ?? body.dateOfBirth ?? undefined,
        address: created.address ?? body.address ?? undefined,
        medications: Array.isArray(created.medications) ? created.medications : validMeds,
        prescriptionNotes: created.prescriptionNotes ?? body.prescriptionNotes ?? undefined,
        prescriptionFileName: created.prescriptionFileName ?? body.prescriptionFileName ?? undefined,
        assignedDeviceId: created.assignedDeviceId ?? assignedDeviceId ?? null,
        assignedDeviceSerial: created.assignedDeviceSerial ?? assignedDeviceSerial ?? undefined,
        createdAt: created.createdAt ?? new Date().toISOString(),
      };

      if (assignedDeviceId && patient.id) {
        const assignResp = await pharmacyApi.assignDeviceToPatient(assignedDeviceId, {
          patientId: patient.id,
          patientName: patient.fullName,
        });
        const dev = (assignResp as { item?: { id?: string } })?.item;
        if (dev?.id) {
          patient.assignedDeviceId = String(dev.id);
        }
      }

      addPatient(patient);
      toast.success("Patient added", {
        description: `${patient.fullName} has been added and device ${patient.assignedDeviceId ?? "—"} assigned.`,
      });

      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
      navigate("/patients");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add patient</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter basic information, medication schedule, prescription, and assign a device
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="list" aria-label="Add patient steps (use Next to move forward)">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          const isPast = s.id < step;
          const isFuture = s.id > step;
          return (
            <button
              key={s.id}
              type="button"
              role="listitem"
              aria-current={active ? "step" : undefined}
              aria-disabled={isFuture}
              onClick={() => {
                if (active) return;
                if (isFuture) {
                  toast.message("Use Next to continue", {
                    description: "Move forward one step at a time with the Next button below.",
                  });
                  return;
                }
                setStep(s.id);
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-0",
                active &&
                  "border-primary bg-primary/[0.1] text-primary shadow-sm",
                !active &&
                  isPast &&
                  "border-primary/30 bg-primary/[0.06] text-foreground hover:border-primary/45 hover:bg-primary/10",
                !active &&
                  isFuture &&
                  "cursor-not-allowed border-border/70 bg-muted/25 text-muted-foreground opacity-75"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active && "bg-primary text-primary-foreground shadow-sm",
                  !active && isPast && "bg-primary/15 text-primary",
                  !active && isFuture && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
              </span>
              {s.title}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-elevated">
        <div className="h-1 w-full gradient-primary" aria-hidden />
        <div className="space-y-6 p-4 sm:p-6">
          {step !== 2 ? (
            <div className="space-y-1 border-b border-border/70 pb-5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{STEPS[step - 1].title}</h2>
              <p className="text-sm text-muted-foreground">
                {step === 1 && "Patient demographics and contact details"}
                {step === 3 && "Prescription details or upload"}
                {step === 4 && "Assign a device from inventory to this patient"}
              </p>
            </div>
          ) : null}

          <div className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-3 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 via-card to-card p-4 shadow-sm sm:p-5">
                  <IconHeading icon={User} title="Identity & contact" />
                  <p className="text-xs text-muted-foreground">
                    Legal name and phone are required. Email is optional but helps with reminders.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. John Smith"
                        className="border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +1 555 0100"
                        className="border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 via-card to-card p-4 shadow-sm sm:p-5">
                  <IconHeading icon={MapPin} title="Birth date & address" />
                  <p className="text-xs text-muted-foreground">
                    Optional fields — still useful for records and device logistics.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of birth</Label>
                      <DateInput
                        id="dateOfBirth"
                        className="pr-9 min-w-0 border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, city, postal code"
                        className="border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <SingleMedicationScheduleFields
                medication={medication}
                updateMedication={updateMedication}
                setScheduleMode={setScheduleMode}
                setScheduleBoundary={setScheduleBoundary}
                addTemplateTime={addTemplateTime}
                setTemplateTimeAt={setTemplateTimeAt}
                removeTemplateTime={removeTemplateTime}
                addDateTime={addDateTime}
                setDateTimeAt={setDateTimeAt}
                removeDateTime={removeDateTime}
              />
            )}

            {step === 3 && (
              <>
                <div className="space-y-3 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 via-card to-card p-4 shadow-sm sm:p-5">
                  <IconHeading icon={FileText} title="Prescription notes" />
                  <p className="text-xs text-muted-foreground">
                    Free-text details: medication list, prescriber, validity, or special instructions.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="prescriptionNotes">Notes</Label>
                    <Textarea
                      id="prescriptionNotes"
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                      placeholder="Enter prescription details, doctor notes, validity period, etc."
                      rows={5}
                      className="resize-none border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border-2 border-info/25 bg-gradient-to-br from-info/[0.06] via-card to-card p-4 shadow-md sm:p-5">
                  <IconHeading icon={Upload} title="Prescription document" tone="info" />
                  <p className="text-sm text-muted-foreground">
                    Optional attachment — PDF or image (JPG, PNG). File name is saved with the patient for your
                    records.
                  </p>

                  <input
                    ref={prescriptionFileInputRef}
                    id="prescription-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="sr-only"
                    aria-hidden
                    tabIndex={-1}
                    onChange={(e) => {
                      acceptPrescriptionFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />

                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      prescriptionFileName
                        ? `File selected: ${prescriptionFileName}. Click to replace.`
                        : "Upload prescription document. Drop a file or click to browse."
                    }
                    className={cn(
                      "rounded-xl border-2 border-dashed transition-all outline-none",
                      "flex flex-col items-center justify-center text-center gap-1",
                      "min-h-[200px] px-6 py-8 cursor-pointer select-none",
                      "focus-visible:ring-2 focus-visible:ring-info/50 focus-visible:ring-offset-2",
                      prescriptionDragActive
                        ? "border-info bg-info/10 shadow-md shadow-info/10"
                        : prescriptionFileName
                          ? "border-success/50 bg-success/5 hover:bg-success/[0.08]"
                          : "border-info/35 bg-card/90 hover:border-info/55 hover:bg-info/[0.04] shadow-inner"
                    )}
                    onClick={() => openPrescriptionFilePicker()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openPrescriptionFilePicker();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPrescriptionDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPrescriptionDragActive(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setPrescriptionDragActive(false);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPrescriptionDragActive(false);
                      acceptPrescriptionFile(e.dataTransfer.files?.[0]);
                    }}
                  >
                    {prescriptionFileName ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-success/15">
                          <FileCheck className="h-7 w-7 text-success" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0 text-left space-y-1">
                          <p className="text-sm font-semibold text-foreground break-all">{prescriptionFileName}</p>
                          <p className="text-sm text-muted-foreground">Ready to save · Click or drop to replace</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove file"
                          onClick={clearPrescriptionFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                            prescriptionDragActive ? "bg-info/20" : "bg-info/10 ring-1 ring-info/20"
                          )}
                        >
                          <Upload className="h-7 w-7 text-info" aria-hidden />
                        </div>
                        <p className="text-base font-medium text-foreground pt-2">
                          {prescriptionDragActive ? "Drop file to attach" : "Drag & drop or browse"}
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          PDF, JPG, or PNG · one file · stored as reference with this patient
                        </p>
                        <Button
                          type="button"
                          variant="info"
                          size="sm"
                          className="mt-3 shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPrescriptionFilePicker();
                          }}
                        >
                          Choose file
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4 rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.06] via-card to-card p-4 shadow-md sm:p-5">
                <IconHeading icon={Monitor} title="Device assignment" />
                <p className="text-sm text-muted-foreground">
                  Select a device from inventory for this patient. It will be linked when you finish this step.
                </p>
                {unassignedLoading ? (
                  <LoadingCard message="Loading unassigned devices…" />
                ) : unassignedDevices.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-warning/40 bg-warning/5 p-8 text-center shadow-sm">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/15">
                      <Cpu className="h-6 w-6 text-warning" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-foreground">No unassigned devices</p>
                    <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                      Add devices to inventory first, then return to assign one to this patient.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-primary/20 bg-card/95 shadow-inner">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-primary/15 bg-primary/[0.07]">
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Device ID
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                            Select
                          </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                      {unassignedDevices.map((dev) => {
                        const selected = assignedDeviceId === dev.id;
                        return (
                          <tr
                            key={dev.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleAssignDevice(dev.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleAssignDevice(dev.id);
                              }
                            }}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selected
                                ? "bg-primary/12 hover:bg-primary/16 ring-1 ring-inset ring-primary/25"
                                : "hover:bg-muted/35"
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Monitor
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    selected ? "text-primary" : "text-muted-foreground"
                                  )}
                                />
                                <span className="text-sm font-medium text-card-foreground">{dev.id}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {selected ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  Selected
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/80 pt-5 mt-2">
            {step > 1 ? (
              <Button
                type="button"
                variant="secondary"
                className="border border-border/90 shadow-sm"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => navigate("/patients")}>
                Cancel
              </Button>
            )}
            {step < 4 ? (
              <Button
                type="button"
                className="shadow-md shadow-primary/20"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                }
              >
                Next
              </Button>
            ) : (
              <Button
                variant="success"
                className="shadow-md shadow-success/25"
                onClick={handleSubmit}
                disabled={!canProceedStep4 || submitting}
              >
                {submitting ? "Adding patient…" : "Add patient & assign device"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPatient;
