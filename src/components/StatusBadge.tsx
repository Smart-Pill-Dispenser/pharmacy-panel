import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "online" | "offline" | "error" | "stopped" | "pending" | "resolved" | "in_progress" | "active" | "inactive";
  className?: string;
}

const statusClass: Record<string, string> = {
  online: "bg-success/15 text-success",
  offline: "bg-muted text-muted-foreground",
  error: "bg-destructive/15 text-destructive",
  stopped: "bg-warning/15 text-warning",
  pending: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
  in_progress: "bg-info/15 text-info",
  active: "bg-success/15 text-success",
  inactive: "bg-muted text-muted-foreground",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const { t } = useTranslation();
  const label = t(`status.${status}`, { defaultValue: String(status).replace(/_/g, " ") });
  const cls = statusClass[status] || "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cls, className)}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "online" || status === "active" || status === "resolved"
            ? "bg-success"
            : status === "error"
              ? "bg-destructive"
              : status === "pending" || status === "stopped"
                ? "bg-warning"
                : status === "in_progress"
                  ? "bg-info"
                  : "bg-muted-foreground"
        )}
      />
      {label}
    </span>
  );
};

export default StatusBadge;
