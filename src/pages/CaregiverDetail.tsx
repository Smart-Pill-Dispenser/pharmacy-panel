import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Users, Mail, Phone, Monitor } from "lucide-react";
import { mockCaregivers } from "@/data/mockData";
import type { Caregiver } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const CaregiverDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const caregiverFromState = (location.state as { caregiver?: Caregiver })?.caregiver;
  const caregiverStored = caregiverFromState ?? mockCaregivers.find((c) => c.id === id);
  const [caregiver, setCaregiver] = useState<Caregiver | undefined>(caregiverStored);

  React.useEffect(() => {
    const stateCaregiver = (location.state as { caregiver?: Caregiver })?.caregiver;
    const next = stateCaregiver ?? mockCaregivers.find((c) => c.id === id);
    setCaregiver(next);
  }, [id, location.state]);

  if (!caregiver) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Caregiver not found</p>
        <Button variant="outline" onClick={() => navigate("/caregivers")}>
          Back to Caregivers
        </Button>
      </div>
    );
  }

  const setStatus = (status: "active" | "inactive") => {
    setCaregiver((prev) => (prev ? { ...prev, status } : prev));
    toast.success(status === "active" ? "Caregiver enabled" : "Caregiver disabled");
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <button
        type="button"
        onClick={() => navigate("/caregivers")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Users className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{caregiver.name}</h1>
            <p className="text-sm text-muted-foreground">{caregiver.email}</p>
          </div>
        </div>
        <StatusBadge status={caregiver.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.email}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Phone</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.phone || "—"}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Linked devices</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">
            {caregiver.linkedDevices.length > 0
              ? caregiver.linkedDevices.join(", ")
              : "None"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Status</span>
          </div>
          <StatusBadge status={caregiver.status} />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <div className="border-b p-4">
          <h2 className="font-semibold text-card-foreground">Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable this caregiver&apos;s access to the system.
          </p>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Account status</span>
          <Switch
            checked={caregiver.status === "active"}
            onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
          />
        </div>
      </div>
    </div>
  );
};

export default CaregiverDetail;
