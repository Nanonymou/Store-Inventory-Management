"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ITEM_SECTIONS, type ItemSection } from "@/lib/types";
import type { Site } from "@/lib/types";

export type SectionFilter = ItemSection | "all";

export interface DashboardFilterState {
  siteId: string;
  section: SectionFilter;
  query: string;
}

interface DashboardFiltersProps {
  sites: Site[];
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  /** Whether the site switcher is shown (Admin only). */
  canSwitchSite?: boolean;
  /** Slot for action buttons (e.g. export), rendered on the right. */
  actions?: React.ReactNode;
}

/**
 * The dashboard filter toolbar: site switcher (Admin), section filter, and a
 * keyword search over item code / description / brand. Emits the full filter
 * state on any change so the parent can derive the filtered view.
 */
export function DashboardFilters({
  sites,
  value,
  onChange,
  canSwitchSite = true,
  actions,
}: DashboardFiltersProps) {
  const isFiltered =
    value.section !== "all" || value.query.trim() !== "";

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {canSwitchSite && (
          <Field label="Site">
            <Select
              value={value.siteId}
              onValueChange={(siteId) => onChange({ ...value, siteId })}
              options={sites.map((s) => ({
                value: s.id,
                label: `${s.name} — ${s.location}`,
              }))}
              className="w-[220px]"
            />
          </Field>
        )}

        <Field label="Seksi">
          <Select
            value={value.section}
            onValueChange={(section) =>
              onChange({ ...value, section: section as SectionFilter })
            }
            options={[
              { value: "all", label: "Semua Seksi" },
              ...ITEM_SECTIONS.map((s) => ({ value: s, label: s })),
            ]}
            className="w-[210px]"
          />
        </Field>

        <Field label="Pencarian">
          <div className="relative w-[240px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value.query}
              onChange={(e) => onChange({ ...value, query: e.target.value })}
              placeholder="Item code, deskripsi, brand…"
              className="pl-8"
            />
          </div>
        </Field>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...value, section: "all", query: "" })}
          >
            <X className="size-4" />
            Reset
          </Button>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
