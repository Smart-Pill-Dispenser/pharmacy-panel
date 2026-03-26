import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, Pill, FileText, Monitor, UserMinus, Pencil } from "lucide-react";
import type { Patient } from "@/data/mockData";
import { usePatients } from "@/contexts/PatientsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import LoadingCard from "@/components/LoadingCard";
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

function formatIsoDateShort(iso: string | undefined): string {
  const t = (iso ?? "").trim();
  if (!t) return "—";
  const d = new Date(t + "T12:00:00");
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patients: addedPatients } = usePatients();
  const [unassignOpen, setUnassignOpen] = useState(false);

  const unassignMutation = useMutation({
    mutationFn: (deviceId: string) => pharmacyApi.unassignDevice(deviceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
      if (id) await queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients", id] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      await queryClient.invalidateQueries({ queryKey: ["pharmacy", "dashboard"] });
      toast.success("Device unassigned from patient");
      setUnassignOpen(false);
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? "Failed to unassign device");
    },
  });

  const patientAdded = id ? addedPatients.find((p) => p.id === id) : null;
  const { data: patientResp, isLoading: patientLoading, isError: patientError } = useQuery({
    queryKey: ["pharmacy", "patients", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const resp = await pharmacyApi.getPatient(id);
      return resp?.item ?? null;
    },
    staleTime: 30_000,
  });

  const patientApi = React.useMemo((): Patient | null => {
    if (!patientResp) return null;
    const p: any = patientResp;
    return {
      id: String(p.patientId ?? p.id ?? ""),
      fullName: String(p.fullName ?? ""),
      phone: String(p.phone ?? ""),
      email: String(p.email ?? ""),
      dateOfBirth: String(p.dateOfBirth ?? ""),
      address: String(p.address ?? ""),
      medications: Array.isArray(p.medications) ? p.medications : [],
      prescriptionNotes: String(p.prescriptionNotes ?? ""),
      prescriptionFileName: typeof p.prescriptionFileName === "string" ? p.prescriptionFileName : undefined,
      assignedDeviceId: typeof p.assignedDeviceId === "string" ? p.assignedDeviceId : null,
      assignedDeviceSerial: typeof p.assignedDeviceSerial === "string" ? p.assignedDeviceSerial : undefined,
      assignedDeviceValidUntil:
        typeof p.assignedDeviceValidUntil === "string" && p.assignedDeviceValidUntil.trim()
          ? p.assignedDeviceValidUntil.trim()
          : undefined,
      createdAt: String(p.createdAt ?? ""),
    };
  }, [patientResp]);

  const patient = patientApi ?? patientAdded;

  if (!patient && patientLoading) {
    return <LoadingCard message="Loading patient details…" />;
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">{patientError ? "Failed to load patient" : "Patient not found"}</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
        <button
          onClick={() => navigate("/patients")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
              <User className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patient.fullName}</h1>
              <p className="text-sm text-muted-foreground">Added by pharmacy · {patient.id}</p>
            </div>
          </div>
          {patientApi && id ? (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(`/patients/${encodeURIComponent(id)}/edit`)}>
              <Pencil className="h-4 w-4" />
              Edit details
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Phone</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{patient.phone || "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Email</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{patient.email || "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Date of birth</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{patient.dateOfBirth || "—"}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Address</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{patient.address || "—"}</p>
            </CardContent>
          </Card>
        </div>

        {patient.assignedDeviceId && (
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Assigned device</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/devices/${patient.assignedDeviceId}`)}>
                    View device
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={unassignMutation.isPending}
                    onClick={() => setUnassignOpen(true)}
                  >
                    <UserMinus className="h-4 w-4 mr-1" aria-hidden />
                    Unassign
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-medium text-muted-foreground">Device ID</p>
              <p className="text-sm font-medium text-foreground">{patient.assignedDeviceId}</p>
              {(() => {
                const did = patient.assignedDeviceId.trim();
                const sn = patient.assignedDeviceSerial?.trim();
                if (!sn || sn === did) return null;
                return (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Serial no.: <span className="text-foreground font-medium">{sn}</span>
                  </p>
                );
              })()}
              <div className="text-xs space-y-1.5 pt-3 mt-3 border-t border-border/60">
                <p className="text-muted-foreground">
                  Valid until{" "}
                  <span className="text-foreground font-medium">
                    {patient.assignedDeviceValidUntil?.trim()
                      ? patient.assignedDeviceValidUntil
                      : "—"}
                  </span>
                  {patient.assignedDeviceValidUntil?.trim() ? (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      ({formatIsoDateShort(patient.assignedDeviceValidUntil)})
                    </span>
                  ) : (
                    <span className="font-normal"> · Edit patient to set an end date</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <AlertDialog
          open={unassignOpen}
          onOpenChange={(open) => {
            if (!open && !unassignMutation.isPending) setUnassignOpen(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unassign device?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove{" "}
                <span className="font-medium text-foreground">{patient.assignedDeviceId}</span> from{" "}
                <span className="font-medium text-foreground">{patient.fullName}</span>. You can assign a device again
                from the Devices page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={unassignMutation.isPending}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={unassignMutation.isPending || !patient.assignedDeviceId}
                onClick={() => {
                  if (patient.assignedDeviceId) unassignMutation.mutate(patient.assignedDeviceId);
                }}
              >
                {unassignMutation.isPending ? "Unassigning…" : "Unassign"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {patient.medications.length > 0 && (
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Medications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {patient.medications.map((m, i) => (
                  <li key={i} className="text-sm text-foreground rounded-lg border bg-muted/20 p-3 space-y-2">
                    <div>
                      <span className="font-medium">{m.name}</span>
                      {m.dosage ? <span className="text-muted-foreground"> · {m.dosage}</span> : null}
                    </div>
                    {m.instructions ? <p className="text-muted-foreground text-xs">{m.instructions}</p> : null}
                    {m.schedule ? (
                      <div className="text-xs space-y-1.5 pt-1 border-t border-border/60">
                        <p className="text-muted-foreground">
                          Active{" "}
                          <span className="text-foreground font-medium">
                            {m.schedule.startDate} — {m.schedule.endDate}
                          </span>
                        </p>
                        {m.schedule.byDate && Object.keys(m.schedule.byDate).length > 0 ? (
                          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                            {Object.entries(m.schedule.byDate)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([date, times]) => (
                                <li key={date} className="flex flex-wrap gap-x-2 gap-y-0.5">
                                  <span className="text-muted-foreground shrink-0">{date}</span>
                                  <span className="text-foreground font-medium">
                                    {Array.isArray(times) && times.length ? times.join(", ") : "—"}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        ) : m.schedule.byDay ? (
                          <ul className="grid gap-1 sm:grid-cols-2">
                            {Object.entries(m.schedule.byDay).map(([d, times]) =>
                              Array.isArray(times) && times.length ? (
                                <li key={d}>
                                  <span className="text-muted-foreground">{d}:</span>{" "}
                                  <span className="text-foreground font-medium">{times.join(", ")}</span>
                                </li>
                              ) : null
                            )}
                          </ul>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        {m.frequency && <p className="text-xs text-muted-foreground">{m.frequency}</p>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {(patient.prescriptionNotes || patient.prescriptionFileName) && (
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Prescription</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {patient.prescriptionNotes && (
                <p className="text-sm text-foreground">{patient.prescriptionNotes}</p>
              )}
              {patient.prescriptionFileName && (
                <p className="text-xs text-muted-foreground">File: {patient.prescriptionFileName}</p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">Added: {patient.createdAt}</p>
      </div>
    );
};

export default PatientDetail;
