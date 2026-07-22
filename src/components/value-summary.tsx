"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import {
  MOVEMENT_COLUMNS,
  type DailyStockRow,
  type MasterItem,
} from "@/lib/types";
import { cn, formatRupiah } from "@/lib/utils";

interface ValueSummaryProps {
  items: MasterItem[];
  rows: DailyStockRow[];
}

/**
 * Rupiah value recap per stock stream: how much money flows through each
 * movement column (Price × Qty, summed over all items). Inflows (Beginning
 * Balance, Receiving) and outflows (Regular … Spoil) are separated, with
 * headline totals for money in, money out, and the resulting balance value.
 */
export function ValueSummary({ items, rows }: ValueSummaryProps) {
  const { perColumn, totalIn, totalOut } = React.useMemo(() => {
    const priceByItem = new Map(items.map((i) => [i.id, i.price]));
    const totals: Record<string, number> = {};
    for (const col of MOVEMENT_COLUMNS) totals[col.key] = 0;

    for (const row of rows) {
      const price = priceByItem.get(row.itemId) ?? 0;
      for (const col of MOVEMENT_COLUMNS) {
        totals[col.key] += price * row[col.key];
      }
    }

    let inSum = 0;
    let outSum = 0;
    for (const col of MOVEMENT_COLUMNS) {
      if (col.isOutflow) outSum += totals[col.key];
      else inSum += totals[col.key];
    }
    return { perColumn: totals, totalIn: inSum, totalOut: outSum };
  }, [items, rows]);

  const balanceValue = totalIn - totalOut;

  return (
    <div className="space-y-4">
      {/* Headline totals. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <HeadlineCard
          label="Nilai Masuk"
          hint="Beginning Balance + Receiving"
          value={totalIn}
          tone="in"
          icon={ArrowUpRight}
        />
        <HeadlineCard
          label="Nilai Keluar"
          hint="Regular, Snack, … Spoil"
          value={totalOut}
          tone="out"
          icon={ArrowDownRight}
        />
        <HeadlineCard
          label="Nilai Balance"
          hint="Masuk − Keluar"
          value={balanceValue}
          tone="balance"
          icon={Scale}
        />
      </div>

      {/* Per-stream breakdown. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {MOVEMENT_COLUMNS.map((col) => (
          <div
            key={col.key}
            className="rounded-lg border bg-card p-3"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  col.isOutflow ? "bg-destructive/70" : "bg-emerald-500/70",
                )}
              />
              {col.label}
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums">
              {formatRupiah(perColumn[col.key])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadlineCard({
  label,
  hint,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  hint: string;
  value: number;
  tone: "in" | "out" | "balance";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "in"
      ? "text-emerald-700"
      : tone === "out"
        ? "text-destructive"
        : "text-primary";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("size-4", toneClass)} />
      </div>
      <div className={cn("mt-1 text-xl font-bold tabular-nums", toneClass)}>
        {formatRupiah(value)}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
