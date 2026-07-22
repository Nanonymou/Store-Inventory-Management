"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TransferSort, TransferSortKey } from "./transfer-history-table";
import type { TransferStatus } from "@/lib/transfer-mock";

export interface TransferFilterState {
  status: TransferStatus | "all";
  /** Match against either the origin or destination site, or "all". */
  site: string;
  /** Keyword over item code / description. */
  query: string;
}

export const EMPTY_TRANSFER_FILTERS: TransferFilterState = {
  status: "all",
  site: "all",
  query: "",
};

interface TransferFiltersProps {
  value: TransferFilterState;
  onChange: (next: TransferFilterState) => void;
  /** Distinct site names present in the transfer history. */
  sites: string[];
  sort: TransferSort;
  onSortChange: (sort: TransferSort) => void;
}

const SORT_OPTIONS: { value: string; label: string; sort: TransferSort }[] = [
  { value: "date-desc", label: "Tanggal terbaru", sort: { key: "date", dir: "desc" } },
  { value: "date-asc", label: "Tanggal terlama", sort: { key: "date", dir: "asc" } },
  { value: "quantity-desc", label: "Qty terbanyak", sort: { key: "quantity", dir: "desc" } },
  { value: "quantity-asc", label: "Qty tersedikit", sort: { key: "quantity", dir: "asc" } },
];

/**
 * Filter + sort controls for the transfer history: status, involved site,
 * keyword search, and a sort selector (mirrors the sortable table headers).
 */
export function TransferFilters({
  value,
  onChange,
  sites,
  sort,
  onSortChange,
}: TransferFiltersProps) {
  const set = <K extends keyof TransferFilterState>(
    key: K,
    v: TransferFilterState[K],
  ) => onChange({ ...value, [key]: v });

  const hasFilter =
    value.status !== "all" || value.site !== "all" || value.query.trim() !== "";

  const sortValue =
    SORT_OPTIONS.find(
      (o) => o.sort.key === sort.key && o.sort.dir === sort.dir,
    )?.value ?? "date-desc";

  return (
    <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <Select
          value={value.status}
          onValueChange={(v) => set("status", v as TransferStatus | "all")}
          options={[
            { value: "all", label: "Semua Status" },
            { value: "approved", label: "Disetujui" },
            { value: "pending", label: "Menunggu" },
            { value: "rejected", label: "Ditolak" },
          ]}
          className="w-full sm:w-[170px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Site (asal/tujuan)</Label>
        <Select
          value={value.site}
          onValueChange={(v) => set("site", v)}
          options={[
            { value: "all", label: "Semua Site" },
            ...sites.map((s) => ({ value: s, label: s })),
          ]}
          className="w-full sm:w-[180px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Pencarian</Label>
        <div className="relative w-full sm:w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.query}
            onChange={(e) => set("query", e.target.value)}
            placeholder="Item code / deskripsi…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Urutkan</Label>
        <Select
          value={sortValue}
          onValueChange={(v) => {
            const opt = SORT_OPTIONS.find((o) => o.value === v);
            if (opt) onSortChange(opt.sort);
          }}
          options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          className="w-full sm:w-[170px]"
        />
      </div>

      {hasFilter && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_TRANSFER_FILTERS)}
        >
          <X className="size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}

/** The sort key used when a header is clicked, folded back into the selector. */
export type { TransferSortKey };
