"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface AuditFilterState {
  user: string;
  action: string;
  from: string;
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilterState = {
  user: "all",
  action: "all",
  from: "",
  to: "",
};

interface AuditLogFiltersProps {
  value: AuditFilterState;
  onChange: (next: AuditFilterState) => void;
  users: string[];
  actions: SelectOption[];
}

/**
 * The combined Audit Log filter bar: user, action type, and an inclusive date
 * range. Emits the full filter state on any change and surfaces active filters
 * as removable chips so it's clear what's applied.
 */
export function AuditLogFilters({
  value,
  onChange,
  users,
  actions,
}: AuditLogFiltersProps) {
  const set = <K extends keyof AuditFilterState>(
    key: K,
    v: AuditFilterState[K],
  ) => onChange({ ...value, [key]: v });

  const hasFilter =
    value.user !== "all" ||
    value.action !== "all" ||
    value.from !== "" ||
    value.to !== "";
  const rangeInvalid =
    value.from !== "" && value.to !== "" && value.from > value.to;

  const actionLabel = (key: string) =>
    actions.find((a) => a.value === key)?.label ?? key;

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (value.user !== "all")
    chips.push({
      key: "user",
      label: `Pengguna: ${value.user}`,
      clear: () => set("user", "all"),
    });
  if (value.action !== "all")
    chips.push({
      key: "action",
      label: `Aksi: ${actionLabel(value.action)}`,
      clear: () => set("action", "all"),
    });
  if (value.from)
    chips.push({
      key: "from",
      label: `Dari: ${value.from}`,
      clear: () => set("from", ""),
    });
  if (value.to)
    chips.push({
      key: "to",
      label: `Sampai: ${value.to}`,
      clear: () => set("to", ""),
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-user">Pengguna</Label>
          <Select
            value={value.user}
            onValueChange={(v) => set("user", v)}
            options={[
              { value: "all", label: "Semua Pengguna" },
              ...users.map((u) => ({ value: u, label: u })),
            ]}
            className="w-full sm:w-[220px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-action">Jenis Aksi</Label>
          <Select
            value={value.action}
            onValueChange={(v) => set("action", v)}
            options={[{ value: "all", label: "Semua Aksi" }, ...actions]}
            className="w-full sm:w-[190px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-from">Dari tanggal</Label>
          <Input
            id="filter-from"
            type="date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => set("from", e.target.value)}
            className="w-full sm:w-[170px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-to">Sampai tanggal</Label>
          <Input
            id="filter-to"
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => set("to", e.target.value)}
            className="w-full sm:w-[170px]"
          />
        </div>
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_AUDIT_FILTERS)}
          >
            <X className="size-4" />
            Reset
          </Button>
        )}
      </div>

      {rangeInvalid && (
        <p className="text-xs text-destructive">
          Tanggal &quot;Dari&quot; tidak boleh melewati &quot;Sampai&quot;.
        </p>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filter aktif:</span>
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.clear}
                aria-label={`Hapus filter ${chip.label}`}
                className="rounded-full p-0.5 hover:bg-background/60"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
