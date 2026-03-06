import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, Pill, FileText, Monitor } from "lucide-react";
import { mockDevices } from "@/data/mockData";
import { usePatients } from "@/contexts/PatientsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patients: addedPatients } = usePatients();

  const patientAdded = id ? addedPatients.find((p) => p.id === id) : null;
  const device = id ? mockDevices.find((d) => d.id === id) : null;

  if (!patientAdded && !device) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Patient not found</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  if (patientAdded) {
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
              <h1 className="text-2xl font-bold text-foreground">{patientAdded.fullName}</h1>
              <p className="text-sm text-muted-foreground">Added by pharmacy · {patientAdded.id}</p>
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
              <p className="text-sm font-medium text-foreground">{patientAdded.phone || "—"}</p>
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
              <p className="text-sm font-medium text-foreground">{patientAdded.email || "—"}</p>
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
              <p className="text-sm font-medium text-foreground">{patientAdded.dateOfBirth || "—"}</p>
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
              <p className="text-sm font-medium text-foreground">{patientAdded.address || "—"}</p>
            </CardContent>
          </Card>
        </div>

        {patientAdded.assignedDeviceId && (
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Assigned device</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/devices/${patientAdded.assignedDeviceId}`)}>
                  View device
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-foreground">{patientAdded.assignedDeviceId}</p>
              {patientAdded.assignedDeviceSerial && (
                <p className="text-xs text-muted-foreground mt-1">Serial: {patientAdded.assignedDeviceSerial}</p>
              )}
            </CardContent>
          </Card>
        )}

        {patientAdded.medications.length > 0 && (
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Medications</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {patientAdded.medications.map((m, i) => (
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

        {(patientAdded.prescriptionNotes || patientAdded.prescriptionFileName) && (
          <Card className="rounded-xl border bg-card shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Prescription</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {patientAdded.prescriptionNotes && (
                <p className="text-sm text-foreground">{patientAdded.prescriptionNotes}</p>
              )}
              {patientAdded.prescriptionFileName && (
                <p className="text-xs text-muted-foreground">File: {patientAdded.prescriptionFileName}</p>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">Added: {patientAdded.createdAt}</p>
      </div>
    );
  }

  if (device) {
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
              <h1 className="text-2xl font-bold text-foreground">{device.patientName}</h1>
              <p className="text-sm text-muted-foreground">From device · {device.id}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(`/devices/${device.id}`)}>
            View device details
          </Button>
        </div>

        <Card className="rounded-xl border bg-card shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Assigned device</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium text-foreground">{device.id}</p>
            <p className="text-xs text-muted-foreground">Serial: {device.serialNumber}</p>
            <p className="text-xs text-muted-foreground">Caregiver: {device.assignedCaregiver}</p>
            <p className="text-xs text-muted-foreground">Pouches: {device.remainingPouches} / {device.totalPouches}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate(`/devices/${device.id}`)}>
              Open device
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default PatientDetail;
