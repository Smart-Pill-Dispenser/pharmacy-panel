import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Users, Mail, Phone, Monitor, Building2, CalendarClock } from "lucide-react";
import type { Caregiver } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "@/api/pharmacy";
import { caregiverFromApiRow, formatCaregiverDateTime } from "@/lib/caregiverFromApi";
import LoadingCard from "@/components/LoadingCard";

const CaregiverDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const caregiverFromState = (location.state as { caregiver?: Caregiver })?.caregiver;
  const queryClient = useQueryClient();
  const [caregiver, setCaregiver] = useState<Caregiver | undefined>(() =>
    caregiverFromState
      ? caregiverFromApiRow(caregiverFromState as unknown as Record<string, unknown>)
      : undefined
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pharmacy", "caregivers", id],
    enabled: !!id,
    queryFn: () => pharmacyApi.getCaregiver(id!),
  });

  const caregiverFromQuery = data?.item;

  useEffect(() => {
    if (caregiverFromQuery && typeof caregiverFromQuery === "object") {
      setCaregiver(caregiverFromApiRow(caregiverFromQuery as Record<string, unknown>));
    }
  }, [caregiverFromQuery]);

  const updateCaregiverStatus = useMutation({
    mutationFn: ({ isActive }: { isActive: boolean }) => pharmacyApi.updateCaregiverStatus(id!, { isActive }),
    onMutate: ({ isActive }) => {
      setCaregiver((prev) => (prev ? { ...prev, status: isActive ? "active" : "inactive" } : prev));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "caregivers", id] });
      toast.success(t("caregiverDetail.statusUpdated"));
    },
    onError: (e: any) => {
      toast.error(e?.message ?? t("caregiverDetail.statusFailed"));
      queryClient.invalidateQueries({ queryKey: ["pharmacy", "caregivers", id] });
    },
  });

  if (isLoading) {
    return <LoadingCard message={t("caregiverDetail.loading")} />;
  }

  if (!caregiver && isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-4">{t("caregiverDetail.loadFailed")}</p>
        <Button variant="outline" onClick={() => navigate("/caregivers")}>
          {t("caregiverDetail.backToList")}
        </Button>
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">{t("caregiverDetail.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/caregivers")}>
          {t("caregiverDetail.backToList")}
        </Button>
      </div>
    );
  }
  const dash = t("common.dash");

  const setStatus = (status: "active" | "inactive") => {
    updateCaregiverStatus.mutate({ isActive: status === "active" });
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <button
        type="button"
        onClick={() => navigate("/caregivers")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Users className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{caregiver.name}</h1>
            <p className="text-sm text-muted-foreground">{caregiver.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("caregiverDetail.caregiverId")} <span className="font-mono">{caregiver.id}</span>
            </p>
          </div>
        </div>
        <StatusBadge status={caregiver.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.email")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.email}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.phone")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.phone || dash}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.linkedDevices")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">
            {caregiver.linkedDevices.length > 0
              ? caregiver.linkedDevices.join(", ")
              : t("common.none")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">{t("common.status")}</span>
          </div>
          <StatusBadge status={caregiver.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.organization")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground font-mono break-all">
            {caregiver.organizationId?.trim() || dash}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.recordCreated")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{formatCaregiverDateTime(caregiver.createdAt)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.lastUpdated")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{formatCaregiverDateTime(caregiver.updatedAt)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <div className="border-b p-4">
          <h2 className="font-semibold text-card-foreground">{t("caregiverDetail.accessTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("caregiverDetail.accessHint")}
          </p>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("caregiverDetail.accountStatus")}</span>
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
