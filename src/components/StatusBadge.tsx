import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "online" | "offline" | "error" | "stopped" | "pending" | "resolved" | "in_progress" | "active" | "inactive";
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  online: { label: "Online", className: "bg-success/15 text-success" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground" },
  error: { label: "Error", className: "bg-destructive/15 text-destructive" },
  stopped: { label: "Stopped", className: "bg-warning/15 text-warning" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning" },
  resolved: { label: "Resolved", className: "bg-success/15 text-success" },
  in_progress: { label: "In Progress", className: "bg-info/15 text-info" },
  active: { label: "Active", className: "bg-success/15 text-success" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", config.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "online" || status === "active" || status === "resolved" ? "bg-success" : status === "error" ? "bg-destructive" : status === "pending" || status === "stopped" ? "bg-warning" : status === "in_progress" ? "bg-info" : "bg-muted-foreground")} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
