import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, Pill, FileText, Monitor } from "lucide-react";
import type { Patient } from "@/data/mockData";
import { usePatients } from "@/contexts/PatientsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import LoadingCard from "@/components/LoadingCard";

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patients: addedPatients } = usePatients();

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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Assigned device</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/devices/${patient.assignedDeviceId}`)}>
                  View device
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{patient.assignedDeviceId}</p>
              {patient.assignedDeviceSerial && (
                <p className="text-xs text-muted-foreground mt-1">Serial: {patient.assignedDeviceSerial}</p>
              )}
            </CardContent>
          </Card>
        )}

        {patient.medications.length > 0 && (
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Medications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {patient.medications.map((m, i) => (
                  <li key={i} className="text-sm text-foreground">
                    <span className="font-medium">{m.name}</span>
                    {m.dosage && ` · ${m.dosage}`}
                    {m.frequency && ` · ${m.frequency}`}
                    {m.instructions && ` · ${m.instructions}`}
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
