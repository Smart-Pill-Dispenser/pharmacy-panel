import React from "react";

export default function LoadingCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <div className="mx-auto w-full max-w-md animate-pulse">
        <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40" />
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted/60 dark:bg-muted/40" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-5/6 rounded bg-muted/60 dark:bg-muted/40" />
          <div className="h-4 w-4/6 rounded bg-muted/60 dark:bg-muted/40" />
          <div className="h-4 w-3/6 rounded bg-muted/60 dark:bg-muted/40" />
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

