"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  /** Disable any date after today (used to lock future dates). */
  disableFuture?: boolean;
  /** When true the field is read-only (e.g. a Storeman is locked to today). */
  disabled?: boolean;
  className?: string;
}

/**
 * A calendar dropdown. Renders a trigger button showing the selected date and
 * a popover (built with a lightweight click-outside handler to avoid extra
 * Radix dependencies) containing the calendar.
 */
export function DatePicker({
  value,
  onChange,
  disableFuture = true,
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-[220px] justify-start text-left font-normal",
          !value && "text-muted-foreground",
        )}
      >
        <CalendarIcon className="mr-2 size-4" />
        {value
          ? format(value, "EEEE, dd MMMM yyyy", { locale: localeId })
          : "Pilih tanggal"}
      </Button>
      {open && !disabled && (
        <div className="absolute z-50 mt-2 rounded-md border bg-popover text-popover-foreground shadow-md">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value}
            disabled={disableFuture ? { after: today } : undefined}
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setOpen(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
