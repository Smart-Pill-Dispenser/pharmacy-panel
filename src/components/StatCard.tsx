import React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "warning" | "success" | "destructive" | "info";
  className?: string;
  loading?: boolean;
}

const variantBorderStyles: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "border border-border",
  warning: "border border-t-0 border-r-0 border-b-0 border-l-4 border-l-warning",
  success: "border border-t-0 border-r-0 border-b-0 border-l-4 border-l-success",
  destructive: "border border-t-0 border-r-0 border-b-0 border-l-4 border-l-destructive",
  info: "border border-t-0 border-r-0 border-b-0 border-l-4 border-l-info",
};

const variantIconStyles: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "bg-muted text-muted-foreground",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-info/15 text-info",
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  variant = "default",
  className,
  loading = false,
}) => {
  return (
    <div
      className={cn(
        "rounded-xl bg-card p-5 shadow-card",
        variantBorderStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-normal text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-1 space-y-2">
              <div className="h-8 w-3/4 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted/60 dark:bg-muted/40 animate-pulse" />
            </div>
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold text-card-foreground">{value}</p>
              {trend != null && trend !== "" && (
                <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
              )}
            </>
          )}
        </div>
        {loading ? (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", variantIconStyles[variant])}>
            <div className="h-4 w-4 rounded-full bg-muted/60 dark:bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", variantIconStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
