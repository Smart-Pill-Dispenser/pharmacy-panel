import * as React from "react";

import { Input } from "@/components/ui/input";

export type DateInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

/**
 * Native `input[type="date"]` wrapper that opens the picker
 * when the user clicks anywhere on the field (not only the browser icon).
 */
export function DateInput({ onClick, onPointerDown, ...props }: DateInputProps) {
  const ref = React.useRef<HTMLInputElement | null>(null);
  const lastOpenAtRef = React.useRef<number>(0);

  const openPicker = () => {
    const el = ref.current;
    if (!el) return;

    const now = Date.now();
    if (now - lastOpenAtRef.current < 300) return;
    lastOpenAtRef.current = now;

    const anyEl = el as any;
    if (typeof anyEl.showPicker === "function") {
      try {
        anyEl.showPicker();
        return;
      } catch {
        // Fall through.
      }
    }

    el.focus();
  };

  return (
    <Input
      {...props}
      ref={ref}
      type="date"
      onPointerDown={(e) => {
        openPicker();
        onPointerDown?.(e);
      }}
      onClick={(e) => {
        openPicker();
        onClick?.(e);
      }}
    />
  );
}

