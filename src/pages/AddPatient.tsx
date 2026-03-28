import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
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
  Search,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

/** Add `days` to a calendar date given as YYYY-MM-DD (local). */
function addDaysIsoLocal(iso: string, days: number): string {
  const t = iso.trim();
  if (!t) return todayIsoDateLocal();
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function normalizeDeviceKey(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function deviceRowMatchesSelection(row: { id: string; serialNumber?: string }, selectedId: string): boolean {
  const sel = selectedId.trim();
  if (!sel) return false;
  if (row.id.trim() === sel) return true;
  const sn = (row.serialNumber ?? "").trim();
  if (sn && sn === sel) return true;
  if (normalizeDeviceKey(row.id) === normalizeDeviceKey(sel)) return true;
  if (sn && normalizeDeviceKey(sn) === normalizeDeviceKey(sel)) return true;
  return false;
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
  /** Max pouches for dispenser / course capacity (patient tablet shows x / this). */
  maxPouches: string;
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
  const today = todayIsoDateLocal();
  return {
    name: "",
    dosage: "",
    instructions: "",
    maxPouches: "",
    scheduleStart: today,
    scheduleEnd: today,
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

function toPatientMedication(
  m: ScheduledMedicationForm,
  tr: (key: string, opts?: Record<string, unknown>) => string
): PatientMedication {
  const days = datesInRange(m.scheduleStart, m.scheduleEnd);
  const byDate: Record<string, string[]> = {};
  for (const d of days) {
    byDate[d] = normalizeTimes(m.byDate[d] ?? []);
  }
  const totalSlots = Object.values(byDate).reduce((n, arr) => n + arr.length, 0);
  const mp = parseInt(m.maxPouches.trim(), 10);
  const maxPouches = Number.isFinite(mp) && mp > 0 ? mp : undefined;
  return {
    name: m.name.trim(),
    dosage: m.dosage.trim(),
    instructions: m.instructions.trim() || undefined,
    frequency: tr("addPatient.freqSummary", {
      start: m.scheduleStart,
      end: m.scheduleEnd,
      days: days.length,
      slots: totalSlots,
    }),
    ...(maxPouches != null ? { maxPouches } : {}),
    schedule: {
      startDate: m.scheduleStart,
      endDate: m.scheduleEnd,
      byDate,
    },
  };
}

/** Hydrate the add-patient medication form from an API/mock medication line (first schedule wins). */
function patientMedicationToForm(pm: PatientMedication | undefined | null): ScheduledMedicationForm {
  const empty = createEmptyMedication();
  const maxPouchesStr =
    pm?.maxPouches != null && Number(pm.maxPouches) > 0 ? String(Math.floor(Number(pm.maxPouches))) : "";
  if (!pm?.schedule?.startDate?.trim() || !pm.schedule.endDate?.trim()) {
    return {
      ...empty,
      name: pm?.name?.trim() ?? "",
      dosage: pm?.dosage?.trim() ?? "",
      instructions: pm?.instructions?.trim() ?? "",
      maxPouches: maxPouchesStr,
    };
  }
  const start = pm.schedule.startDate.trim();
  const end = pm.schedule.endDate.trim();
  if (!datesValid(start, end)) return { ...empty, maxPouches: maxPouchesStr };
  const rawBy = pm.schedule.byDate && typeof pm.schedule.byDate === "object" ? { ...pm.schedule.byDate } : {};
  const days = datesInRange(start, end);
  const byDate: Record<string, string[]> = {};
  for (const d of days) {
    byDate[d] = normalizeTimes(rawBy[d] ?? []);
  }
  const firstDayTimes = days.length ? byDate[days[0]] ?? [] : [];
  let tmpl = firstDayTimes.length ? [...firstDayTimes] : ["09:00"];
  const allEmpty = days.length > 0 && days.every((d) => (byDate[d]?.length ?? 0) === 0);
  if (allEmpty) {
    const fill = tmpl.length ? tmpl : ["09:00"];
    for (const d of days) {
      byDate[d] = [...fill];
    }
    tmpl = [...fill];
  }
  const allSame =
    days.length > 0 &&
    days.every((d) => timesSignature(byDate[d] ?? []) === timesSignature(tmpl));
  return {
    name: pm.name?.trim() ?? "",
    dosage: pm.dosage?.trim() ?? "",
    instructions: pm.instructions?.trim() ?? "",
    maxPouches: maxPouchesStr,
    scheduleStart: start,
    scheduleEnd: end,
    scheduleMode: days.length ? (allSame ? "same" : "custom") : null,
    defaultTimesTemplate: tmpl.length ? tmpl : ["09:00"],
    byDate,
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
  relaxScheduleDateLimits = false,
}: ScheduleHandlers & { relaxScheduleDateLimits?: boolean }) {
  const { t } = useTranslation();
  const todayMin = todayIsoDateLocal();
  const rangeOk = datesValid(med.scheduleStart, med.scheduleEnd);
  const days = rangeOk ? datesInRange(med.scheduleStart, med.scheduleEnd) : [];
  const tmplSig = timesSignature(med.defaultTimesTemplate);
  const endDateMin = relaxScheduleDateLimits
    ? med.scheduleStart.trim() || undefined
    : laterIsoDate(med.scheduleStart, todayMin) ?? todayMin;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevated">
      <div className="h-1 w-full gradient-primary" aria-hidden />
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("addPatient.schedule.sectionTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("addPatient.schedule.sectionIntro")}
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-gradient-to-b from-muted/35 via-card to-card p-4 shadow-sm sm:p-5">
          <IconHeading icon={Pill} title={t("addPatient.schedule.medicineInfo")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("addPatient.schedule.medName")}</Label>
              <Input
                value={med.name}
                onChange={(e) => updateMedication({ name: e.target.value })}
                placeholder={t("addPatient.schedule.medNamePh")}
                className="border-border/80 bg-background shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("addPatient.schedule.dosage")}</Label>
              <Input
                value={med.dosage}
                onChange={(e) => updateMedication({ dosage: e.target.value })}
                placeholder={t("addPatient.schedule.dosagePh")}
                className="border-border/80 bg-background shadow-sm"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("addPatient.schedule.instructions")}</Label>
              <Textarea
                value={med.instructions}
                onChange={(e) => updateMedication({ instructions: e.target.value })}
                placeholder={t("addPatient.schedule.instructionsPh")}
                rows={2}
                className="resize-none min-h-[72px] border-border/80 bg-background shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("addPatient.schedule.maxPouches")}</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={med.maxPouches}
                onChange={(e) => updateMedication({ maxPouches: e.target.value.replace(/[^\d]/g, "") })}
                placeholder={t("addPatient.schedule.maxPouchesPh")}
                className="border-border/80 bg-background shadow-sm"
              />
              <p className="text-xs text-muted-foreground">
                {t("addPatient.schedule.maxPouchesHint")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 bg-gradient-to-b from-muted/35 via-card to-card p-4 shadow-sm sm:p-5">
          <IconHeading icon={Calendar} title={t("addPatient.schedule.periodTitle")} />
          <p className="text-xs text-muted-foreground">
            {t("addPatient.schedule.periodHint")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sched-start-med">{t("addPatient.schedule.startDate")}</Label>
              <DateInput
                id="sched-start-med"
                className="pr-9 min-w-0 border-border/80 bg-background shadow-sm"
                value={med.scheduleStart}
                min={relaxScheduleDateLimits ? undefined : todayMin}
                onChange={(e) => setScheduleBoundary("scheduleStart", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sched-end-med">{t("addPatient.schedule.endDate")}</Label>
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
          <IconHeading icon={Clock} title={t("addPatient.schedule.dispenseTimesTitle")} />
          <p className="text-xs text-muted-foreground">
            <Trans
              i18nKey="addPatient.schedule.dispenseTimesHintRich"
              components={[
                <span className="font-medium text-primary" key="0" />,
                <span className="font-medium text-info" key="1" />,
              ]}
            />
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
                  <div className="font-semibold text-foreground">{t("addPatient.schedule.sameSchedule")}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t("addPatient.schedule.sameScheduleDesc")}
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
                  <div className="font-semibold text-foreground">{t("addPatient.schedule.customSchedule")}</div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t("addPatient.schedule.customScheduleDesc")}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {med.scheduleMode === "same" && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-primary/[0.05] p-4 shadow-sm sm:p-5">
            <IconHeading icon={Clock} title={t("addPatient.schedule.defaultTimesTitle")} />
            <p className="text-xs text-muted-foreground">
              {t("addPatient.schedule.defaultTimesHint")}
            </p>
            <div className="space-y-2 rounded-lg bg-muted/40 p-3 sm:p-4">
              <Label className="text-xs font-medium text-primary">{t("addPatient.schedule.templateTimes")}</Label>
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
                      aria-label={t("addPatient.schedule.removeTemplateTime")}
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
                  {t("addPatient.schedule.addTime")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {med.scheduleMode === "custom" && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-info/[0.04] p-4 shadow-sm sm:p-5">
            <IconHeading icon={CalendarDays} title={t("addPatient.schedule.calendarTitle")} tone="info" />
            {!rangeOk ? (
              <p className="text-sm text-muted-foreground">{t("addPatient.schedule.setValidRange")}</p>
            ) : days.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("addPatient.schedule.noDaysInRange")}</p>
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
                            {t("addPatient.schedule.noTimesBadge")}
                          </span>
                        ) : matchesTemplate ? (
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {t("addPatient.schedule.sameAsTemplateBadge")}
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wide font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {t("addPatient.schedule.customTimesBadge")}
                          </span>
                        )}
                      </div>
                      {times.length === 0 ? (
                        <p className="text-xs text-destructive">{t("addPatient.schedule.addTimeForDate")}</p>
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
                                aria-label={t("addPatient.schedule.removeDispenseTime")}
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
                        {t("addPatient.schedule.addDispenseTime")}
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: editPatientId } = useParams<{ id: string }>();
  const isEditMode = typeof editPatientId === "string" && editPatientId.length > 0;
  const { addPatient, patients: addedPatients } = usePatients();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
  }, [editPatientId]);

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
  const [assignedDeviceValidUntil, setAssignedDeviceValidUntil] = useState<string>("");
  const [deviceAssignSearch, setDeviceAssignSearch] = useState("");
  const [validityDialogOpen, setValidityDialogOpen] = useState(false);
  const [pendingAssignDeviceId, setPendingAssignDeviceId] = useState<string>("");
  const [validityDialogDate, setValidityDialogDate] = useState<string>("");
  const [patientTabletCredentials, setPatientTabletCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const steps = useMemo(
    () => [
      { id: 1, title: t("addPatient.step1"), icon: User },
      { id: 2, title: t("addPatient.step2"), icon: Pill },
      { id: 3, title: t("addPatient.step3"), icon: FileText },
      { id: 4, title: t("addPatient.step4"), icon: Monitor },
    ],
    [t]
  );

  const {
    data: patientResp,
    isLoading: patientLoading,
    isError: patientError,
  } = useQuery({
    queryKey: ["pharmacy", "patients", editPatientId],
    enabled: isEditMode && !!editPatientId,
    queryFn: async () => {
      if (!editPatientId) return null;
      const resp = await pharmacyApi.getPatient(editPatientId);
      return resp?.item ?? null;
    },
    staleTime: 30_000,
  });

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
      const rowPatientId = String(p.patientId ?? p.id ?? "").trim();
      if (isEditMode && editPatientId && rowPatientId === editPatientId) continue;
      const aid = p.assignedDeviceId;
      if (typeof aid === "string" && aid.trim()) s.add(aid.trim());
    }
    for (const p of addedPatients) {
      if (isEditMode && editPatientId && p.id === editPatientId) continue;
      if (p.assignedDeviceId?.trim()) s.add(p.assignedDeviceId.trim());
    }
    return s;
  }, [patientsListForDevices?.items, addedPatients, isEditMode, editPatientId]);

  const unassignedDevices = React.useMemo(() => {
    const raw = (unassignedResp?.items ?? []) as Array<{ id: string; serialNumber: string }>;
    return raw.filter((d) => !deviceIdsAlreadyLinked.has(d.id.trim()));
  }, [unassignedResp?.items, deviceIdsAlreadyLinked]);

  /** Full assignable list: unassigned rows plus this patient's current device (not in unassigned API). */
  const devicesForAssignStepBase = React.useMemo(() => {
    const base = [...unassignedDevices];
    if (isEditMode && patientResp) {
      const p = patientResp as Record<string, unknown>;
      const curId = String(p.assignedDeviceId ?? "").trim();
      if (curId) {
        const inList = base.some((d) => deviceRowMatchesSelection(d, curId));
        if (!inList) {
          const curSn = String(p.assignedDeviceSerial ?? "").trim();
          const label = curSn && normalizeDeviceKey(curSn) !== normalizeDeviceKey(curId) ? curSn : curId;
          base.unshift({ id: curId, serialNumber: label });
        }
      }
    }
    const seen = new Set<string>();
    const deduped: Array<{ id: string; serialNumber: string }> = [];
    for (const d of base) {
      const k = d.id.trim();
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(d);
    }
    return deduped;
  }, [isEditMode, patientResp, unassignedDevices]);

  const devicesForAssignStep = React.useMemo(() => {
    const q = deviceAssignSearch.trim().toLowerCase();
    let rows = devicesForAssignStepBase;
    if (q) {
      rows = rows.filter((d) => {
        const idl = d.id.toLowerCase();
        const sn = (d.serialNumber ?? "").toLowerCase();
        return idl.includes(q) || sn.includes(q);
      });
    }
    const sel = assignedDeviceId;
    return [...rows].sort((a, b) => {
      const ma = deviceRowMatchesSelection(a, sel);
      const mb = deviceRowMatchesSelection(b, sel);
      if (ma && !mb) return -1;
      if (!ma && mb) return 1;
      return 0;
    });
  }, [devicesForAssignStepBase, deviceAssignSearch, assignedDeviceId]);
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
      if (!isEditMode) {
        if (scheduleStart.trim() && scheduleStart < todayMin) {
          scheduleStart = todayMin;
        }
        if (scheduleEnd.trim() && scheduleEnd < todayMin) {
          scheduleEnd = todayMin;
        }
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
      toast.error(t("addPatient.prescriptionFileWrongType"));
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

  const canProceedStep1 = fullName.trim() && phone.trim() && email.trim();
  const canProceedStep2 = !!medication.name.trim() && scheduleComplete(medication);
  const canProceedStep3 = true;
  const canProceedStep4 = !!assignedDeviceId.trim() && !!assignedDeviceValidUntil.trim();

  const openDeviceValidityDialog = (deviceRowId: string) => {
    const dev = devicesForAssignStepBase.find((d) => d.id === deviceRowId);
    if (!dev) return;
    setPendingAssignDeviceId(deviceRowId);
    const sameAsCurrent = deviceRowMatchesSelection(dev, assignedDeviceId);
    const initialDate =
      sameAsCurrent && assignedDeviceValidUntil.trim()
        ? assignedDeviceValidUntil.trim()
        : addDaysIsoLocal(todayIsoDateLocal(), 365);
    setValidityDialogDate(initialDate);
    setValidityDialogOpen(true);
  };

  const confirmDeviceValidity = () => {
    const v = validityDialogDate.trim();
    if (!v) {
      toast.error(t("addPatient.errValidityRequired"));
      return;
    }
    if (v < todayIsoDateLocal()) {
      toast.error(t("addPatient.errValidityPast"));
      return;
    }
    const dev = devicesForAssignStepBase.find((d) => d.id === pendingAssignDeviceId);
    if (!dev) {
      setValidityDialogOpen(false);
      return;
    }
    setAssignedDeviceId(dev.id.trim());
    const sn = dev.serialNumber?.trim();
    setAssignedDeviceSerial(sn && sn !== dev.id.trim() ? sn : "");
    setAssignedDeviceValidUntil(v);
    setValidityDialogOpen(false);
    setPendingAssignDeviceId("");
  };

  useEffect(() => {
    if (!isEditMode || !patientResp || hydratedRef.current) return;
    hydratedRef.current = true;
    const p = patientResp as Record<string, unknown>;
    setFullName(String(p.fullName ?? ""));
    setPhone(String(p.phone ?? ""));
    setEmail(String(p.email ?? ""));
    setDateOfBirth(String(p.dateOfBirth ?? ""));
    setAddress(String(p.address ?? ""));
    setPrescriptionNotes(String(p.prescriptionNotes ?? ""));
    setPrescriptionFileName(
      typeof p.prescriptionFileName === "string" ? p.prescriptionFileName : ""
    );
    const meds = Array.isArray(p.medications) ? p.medications : [];
    setMedication(patientMedicationToForm(meds[0] as PatientMedication));
    const aid = String(p.assignedDeviceId ?? "").trim();
    setAssignedDeviceId(aid);
    const sn = String(p.assignedDeviceSerial ?? "").trim();
    setAssignedDeviceSerial(sn && sn !== aid ? sn : "");
    const rawUntil =
      typeof p.assignedDeviceValidUntil === "string" ? p.assignedDeviceValidUntil.trim() : "";
    if (rawUntil) setAssignedDeviceValidUntil(rawUntil);
    else if (aid) setAssignedDeviceValidUntil(addDaysIsoLocal(todayIsoDateLocal(), 365));
    else setAssignedDeviceValidUntil("");
  }, [isEditMode, patientResp]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const validMeds = [toPatientMedication(medication, t)];
    try {
      if (isEditMode && editPatientId) {
        const pExisting = patientResp as Record<string, unknown> | null | undefined;
        const prevDeviceId = String(pExisting?.assignedDeviceId ?? "").trim();
        const nextDeviceId = assignedDeviceId.trim();

        await pharmacyApi.updatePatient(editPatientId, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          dateOfBirth: dateOfBirth.trim() || undefined,
          address: address.trim() || undefined,
          medications: validMeds,
          prescriptionNotes: prescriptionNotes.trim() || undefined,
          prescriptionFileName: prescriptionFileName.trim() || undefined,
          assignedDeviceValidUntil: assignedDeviceValidUntil.trim() || undefined,
        });

        if (prevDeviceId && nextDeviceId && prevDeviceId !== nextDeviceId) {
          await pharmacyApi.unassignDevice(prevDeviceId);
        }
        if (nextDeviceId && nextDeviceId !== prevDeviceId) {
          await pharmacyApi.assignDeviceToPatient(nextDeviceId, {
            patientId: editPatientId,
            patientName: fullName.trim(),
          });
        }

        toast.success(t("patients.updatedToast"));
        await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
        await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients", editPatientId] });
        await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
        await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
        await queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
        navigate(`/patients/${encodeURIComponent(editPatientId)}`);
        return;
      }

      const body = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        address: address.trim() || undefined,
        medications: validMeds,
        prescriptionNotes: prescriptionNotes.trim() || undefined,
        prescriptionFileName: prescriptionFileName || undefined,
        assignedDeviceId: assignedDeviceId || undefined,
        assignedDeviceSerial: assignedDeviceSerial || undefined,
        assignedDeviceValidUntil: assignedDeviceValidUntil.trim() || undefined,
      };

      const resp = await pharmacyApi.createPatient(body);
      const envelope = resp as {
        item?: Record<string, unknown>;
        patientAppPassword?: string;
        patientAppLoginConfigured?: boolean;
      };
      const created = (envelope.item ?? resp) as Record<string, unknown>;
      const tabletPassword = envelope.patientAppPassword;
      const tabletLoginConfigured = envelope.patientAppLoginConfigured;

      const patient: Patient = {
        id: String(created.patientId ?? created.id ?? ""),
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
        assignedDeviceValidUntil:
          created.assignedDeviceValidUntil ?? body.assignedDeviceValidUntil ?? undefined,
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
      toast.success(t("patients.addToast"), {
        description: t("patients.addToastDesc", {
          name: patient.fullName,
          device: patient.assignedDeviceId ?? t("common.dash"),
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });

      if (tabletPassword && email.trim()) {
        setPatientTabletCredentials({ email: email.trim(), password: tabletPassword });
      } else {
        if (tabletLoginConfigured === false) {
          toast.message(t("patients.tabletLoginTitle"), {
            description: t("patients.tabletLoginDesc"),
          });
        }
        navigate("/patients");
      }
    } catch (e: any) {
      toast.error(e?.message ?? (isEditMode ? t("patients.updateFailed") : t("patients.addFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  if (isEditMode) {
    if (patientLoading) {
      return <LoadingCard message={t("addPatient.loadingPatient")} />;
    }
    if (patientError || !patientResp) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">{t("addPatient.couldNotLoad")}</p>
          <Button variant="outline" onClick={() => navigate("/patients")}>
            {t("addPatient.backToPatients")}
          </Button>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEditMode ? t("addPatient.editTitle") : t("addPatient.addTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditMode ? t("addPatient.editSubtitle") : t("addPatient.addSubtitle")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="list" aria-label={t("addPatient.stepsAria")}>
        {steps.map((s) => {
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
                  toast.message(t("addPatient.useNextTitle"), {
                    description: t("addPatient.useNextDesc"),
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
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{steps[step - 1].title}</h2>
              <p className="text-sm text-muted-foreground">
                {step === 1 && t("addPatient.stepHint1")}
                {step === 3 && t("addPatient.stepHint3")}
                {step === 4 && t("addPatient.stepHint4")}
              </p>
            </div>
          ) : null}

          <div className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-3 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 via-card to-card p-4 shadow-sm sm:p-5">
                  <IconHeading icon={User} title={t("addPatient.identityTitle")} />
                  <p className="text-xs text-muted-foreground">
                    {t("addPatient.identityHint")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t("addPatient.fullName")}</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("addPatient.placeholderFullName")}
                        className="border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t("addPatient.phoneReq")}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t("addPatient.placeholderPhone")}
                        className="border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="email">{t("addPatient.emailLabel")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("addPatient.placeholderEmail")}
                        className="border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 via-card to-card p-4 shadow-sm sm:p-5">
                  <IconHeading icon={MapPin} title={t("addPatient.birthAddressTitle")} />
                  <p className="text-xs text-muted-foreground">
                    {t("addPatient.birthAddressHint")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">{t("addPatient.dateOfBirth")}</Label>
                      <DateInput
                        id="dateOfBirth"
                        className="pr-9 min-w-0 border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">{t("addPatient.address")}</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t("addPatient.placeholderAddress")}
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
                relaxScheduleDateLimits={isEditMode}
              />
            )}

            {step === 3 && (
              <>
                <div className="space-y-3 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 via-card to-card p-4 shadow-sm sm:p-5">
                  <IconHeading icon={FileText} title={t("addPatient.prescriptionNotesTitle")} />
                  <p className="text-xs text-muted-foreground">
                    {t("addPatient.prescriptionNotesHint")}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="prescriptionNotes">{t("common.notes")}</Label>
                    <Textarea
                      id="prescriptionNotes"
                      value={prescriptionNotes}
                      onChange={(e) => setPrescriptionNotes(e.target.value)}
                      placeholder={t("addPatient.prescriptionNotesPlaceholder")}
                      rows={5}
                      className="resize-none border-border/90 bg-background/80 shadow-sm transition-shadow focus-visible:shadow-md"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border-2 border-info/25 bg-gradient-to-br from-info/[0.06] via-card to-card p-4 shadow-md sm:p-5">
                  <IconHeading icon={Upload} title={t("addPatient.prescriptionDocTitle")} tone="info" />
                  <p className="text-sm text-muted-foreground">
                    {t("addPatient.prescriptionDocHint")}
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
                        ? t("addPatient.ariaFileSelected", { name: prescriptionFileName })
                        : t("addPatient.ariaUpload")
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
                          <p className="text-sm text-muted-foreground">{t("addPatient.readyToSave")}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t("addPatient.removeFile")}
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
                          {prescriptionDragActive ? t("addPatient.dropFile") : t("addPatient.dragDropBrowse")}
                        </p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {t("addPatient.fileTypesHint")}
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
                          {t("addPatient.chooseFile")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4 rounded-xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.06] via-card to-card p-4 shadow-md sm:p-5">
                <IconHeading icon={Monitor} title={t("addPatient.deviceAssignmentTitle")} />
                <p className="text-sm text-muted-foreground">
                  {isEditMode ? t("addPatient.deviceAssignmentEdit") : t("addPatient.deviceAssignmentAdd")}
                </p>
                {unassignedLoading ? (
                  <LoadingCard message={t("addPatient.loadingUnassigned")} />
                ) : devicesForAssignStepBase.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-warning/40 bg-warning/5 p-8 text-center shadow-sm">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/15">
                      <Cpu className="h-6 w-6 text-warning" />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-foreground">{t("addPatient.noUnassignedTitle")}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                      {t("addPatient.noUnassignedHint")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={t("addPatient.deviceSearchPlaceholder")}
                        value={deviceAssignSearch}
                        onChange={(e) => setDeviceAssignSearch(e.target.value)}
                        className="pl-9 pr-9"
                        aria-label={t("addPatient.searchDevicesAria")}
                      />
                      {deviceAssignSearch.length > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setDeviceAssignSearch("")}
                          aria-label={t("common.clearSearch")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    {assignedDeviceValidUntil.trim() ? (
                      <p className="text-xs text-muted-foreground">
                        {t("addPatient.assignmentValidUntil", { date: assignedDeviceValidUntil })}
                      </p>
                    ) : null}
                    {devicesForAssignStep.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-8 px-4 text-center">
                        <p className="text-sm font-medium text-foreground">{t("addPatient.noDeviceSearchTitle")}</p>
                        <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                          {t("addPatient.noDeviceSearchHint")}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-primary/20 bg-card/95 shadow-inner">
                        <div className="max-h-[min(280px,42vh)] overflow-y-auto overscroll-contain">
                          <table className="w-full">
                            <thead className="sticky top-0 z-10 bg-primary/[0.07] shadow-sm">
                              <tr className="border-b border-primary/15">
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider bg-primary/[0.07]">
                                  {t("addPatient.colDeviceId")}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-28 bg-primary/[0.07]">
                                  {t("addPatient.colSelect")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {devicesForAssignStep.map((dev) => {
                                const selected = deviceRowMatchesSelection(dev, assignedDeviceId);
                                const displayLabel = dev.serialNumber?.trim() || dev.id;
                                return (
                                  <tr
                                    key={dev.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openDeviceValidityDialog(dev.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        openDeviceValidityDialog(dev.id);
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
                                        <span className="text-sm font-medium text-card-foreground">{displayLabel}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {selected ? (
                                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                                          {t("addPatient.deviceSelected")}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">{t("common.dash")}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
                {t("common.back")}
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => navigate("/patients")}>
                {t("common.cancel")}
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
                {t("common.next")}
              </Button>
            ) : (
              <Button
                variant="success"
                className="shadow-md shadow-success/25"
                onClick={handleSubmit}
                disabled={!canProceedStep4 || submitting}
              >
                {submitting
                  ? isEditMode
                    ? t("addPatient.saving")
                    : t("addPatient.adding")
                  : isEditMode
                    ? t("addPatient.saveChanges")
                    : t("addPatient.submitAdd")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={patientTabletCredentials != null}
        onOpenChange={(open) => {
          if (open) return;
          /* Only the footer Close button clears state; ignore overlay / Escape. */
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          hideCloseButton
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("addPatient.tabletDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("addPatient.tabletDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          {patientTabletCredentials ? (
            <div className="space-y-3 py-1 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("common.email")}</p>
                <p className="font-mono text-foreground font-medium break-all">{patientTabletCredentials.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{t("common.password")}</p>
                <p className="font-mono text-foreground font-semibold tracking-wide select-all break-all">
                  {patientTabletCredentials.password}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setPatientTabletCredentials(null);
                navigate("/patients");
              }}
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={validityDialogOpen}
        onOpenChange={(open) => {
          setValidityDialogOpen(open);
          if (!open) setPendingAssignDeviceId("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addPatient.validityDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("addPatient.validityDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="device-valid-until">{t("addPatient.validUntilLabel")}</Label>
            <DateInput
              id="device-valid-until"
              className="w-full border-border/90 bg-background/80 shadow-sm"
              value={validityDialogDate}
              min={todayIsoDateLocal()}
              onChange={(e) => setValidityDialogDate(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValidityDialogOpen(false);
                setPendingAssignDeviceId("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={confirmDeviceValidity}>
              {t("addPatient.confirmAssignment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddPatient;
