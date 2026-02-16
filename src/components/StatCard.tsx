import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "warning" | "success" | "destructive" | "info";
  className?: string;
}

const variantStyles = {
  default: "border-border",
  warning: "border-l-4 border-l-warning border-t-0 border-r-0 border-b-0",
  success: "border-l-4 border-l-success border-t-0 border-r-0 border-b-0",
  destructive: "border-l-4 border-l-destructive border-t-0 border-r-0 border-b-0",
  info: "border-l-4 border-l-info border-t-0 border-r-0 border-b-0",
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, variant = "default", className }) => {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-card", variantStyles[variant], className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
          {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
