import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Pill, FileText, Monitor, Plus, Trash2, CheckCircle2, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type Patient,
  type PatientMedication,
} from "@/data/mockData";
import { usePatients } from "@/contexts/PatientsContext";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import LoadingCard from "@/components/LoadingCard";

const STEPS = [
  { id: 1, title: "Basic information", icon: User },
  { id: 2, title: "Medication", icon: Pill },
  { id: 3, title: "Prescription", icon: FileText },
  { id: 4, title: "Assign device", icon: Monitor },
];

const AddPatient: React.FC = () => {
  const navigate = useNavigate();
  const { addPatient } = usePatients();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");

  const [medications, setMedications] = useState<PatientMedication[]>([
    { name: "", dosage: "", frequency: "", instructions: "" },
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState("");
  const [prescriptionFileName, setPrescriptionFileName] = useState("");
  const [assignedDeviceId, setAssignedDeviceId] = useState<string>("");
  const [assignedDeviceSerial, setAssignedDeviceSerial] = useState<string>("");

  const { data: unassignedResp, isLoading: unassignedLoading, isError: unassignedError } = useQuery({
    queryKey: ["pharmacy", "devices", "unassigned"],
    queryFn: () => pharmacyApi.getUnassignedDevices(),
    staleTime: 30_000,
  });
  const unassignedDevices = (unassignedResp?.items ?? []) as Array<{ id: string; serialNumber: string }>;
  const [submitting, setSubmitting] = useState(false);

  const addMedicationRow = () => {
    setMedications((prev) => [...prev, { name: "", dosage: "", frequency: "", instructions: "" }]);
  };
  const removeMedicationRow = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };
  const updateMedication = (index: number, field: keyof PatientMedication, value: string) => {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const canProceedStep1 = fullName.trim() && phone.trim();
  const canProceedStep2 = medications.some((m) => m.name.trim());
  const canProceedStep3 = true;
  const canProceedStep4 = !!assignedDeviceId;

  const handleAssignDevice = (id: string) => {
    const dev = unassignedDevices.find((d) => d.id === id);
    setAssignedDeviceId(id);
    setAssignedDeviceSerial(dev?.serialNumber ?? "");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const validMeds = medications.filter((m) => m.name.trim());
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

      // Backend returns `patientId` (not `id`), while UI expects `id`.
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

      // Create device assignment so the Patients list reflects this.
      if (assignedDeviceId && patient.id) {
        await pharmacyApi.assignDeviceToPatient(assignedDeviceId, {
          patientId: patient.id,
          patientName: patient.fullName,
        });
      }

      addPatient(patient);
      toast.success("Patient added", {
        description: `${patient.fullName} has been added and device ${patient.assignedDeviceId ?? "—"} assigned.`,
      });

      // Refresh real inventory and device-derived patient shells.
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "devices", "unassigned"] });
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "patients"] });
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
            Enter basic information, medication, prescription, and assign a device
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.title}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step - 1].title}</CardTitle>
          <CardDescription>
            {step === 1 && "Patient demographics and contact details"}
            {step === 2 && "Medications and dosing"}
            {step === 3 && "Prescription details or upload"}
            {step === 4 && "Assign a device from inventory to this patient"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Smith"
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    className="pr-9 min-w-0"
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
                  />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4">
                {medications.map((med, index) => (
                  <div key={index} className="rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">Medication {index + 1}</span>
                      {medications.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedicationRow(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <Label>Medication name *</Label>
                        <Input
                          value={med.name}
                          onChange={(e) => updateMedication(index, "name", e.target.value)}
                          placeholder="e.g. Metformin"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Dosage</Label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                          placeholder="e.g. 500mg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Frequency</Label>
                        <Input
                          value={med.frequency}
                          onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                          placeholder="e.g. Twice daily"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                        <Label>Instructions</Label>
                        <Input
                          value={med.instructions ?? ""}
                          onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addMedicationRow} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add medication
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prescriptionNotes">Prescription notes</Label>
                  <Textarea
                    id="prescriptionNotes"
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    placeholder="Enter prescription details, doctor notes, validity period, etc."
                    rows={5}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prescription document (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="max-w-xs"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setPrescriptionFileName(f ? f.name : "");
                      }}
                    />
                    {prescriptionFileName && (
                      <span className="text-sm text-muted-foreground truncate">{prescriptionFileName}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Upload PDF or image. Stored for reference.</p>
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Select a device from inventory to assign to this patient. The device will be linked after you complete the flow.
              </p>
              {unassignedLoading ? (
                <LoadingCard message="Loading unassigned devices…" />
              ) : unassignedDevices.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                  <Cpu className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium text-foreground">No unassigned devices</p>
                  <p className="mt-1 text-sm text-muted-foreground">Add devices to inventory first, then return to assign one to this patient.</p>
                </div>
              ) : (
                <div className="rounded-xl border bg-card shadow-card overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Serial</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Select</th>
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
                              selected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm font-medium text-card-foreground">{dev.id}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{dev.serialNumber}</td>
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
            </>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => navigate("/patients")}>
                Cancel
              </Button>
            )}
            {step < 4 ? (
              <Button
                type="button"
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
              <Button onClick={handleSubmit} disabled={!canProceedStep4 || submitting}>
                {submitting ? "Adding patient…" : "Add patient & assign device"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddPatient;
