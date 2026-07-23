"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ITEM_SECTIONS,
  MOVEMENT_COLUMNS,
  type DailyStockRow,
  type ItemSection,
  type MasterItem,
} from "@/lib/types";
import { cn, formatRupiah } from "@/lib/utils";

interface SectionValueMatrixProps {
  items: MasterItem[];
  rows: DailyStockRow[];
}

/**
 * Resume Nilai per Seksi — a matrix that mirrors the reference spreadsheet:
 * each item section is a row, each movement stream (Beginning Balance,
 * Receiving, Regular … Spoil) is a column, and every cell holds the Rupiah
 * value (Price × Qty) summed over the items of that section. A trailing TOTAL
 * column sums each section across all streams, and a TOTAL row sums each
 * stream across all sections.
 */
export function SectionValueMatrix({ items, rows }: SectionValueMatrixProps) {
  const { sectionRows, columnTotals, grandTotal } = React.useMemo(() => {
    const priceByItem = new Map(items.map((i) => [i.id, i.price]));
    const sectionByItem = new Map(items.map((i) => [i.id, i.section]));

    // section -> movement key -> Rupiah value.
    const bySection = new Map<string, Record<string, number>>();
    const ensure = (section: string) => {
      let rec = bySection.get(section);
      if (!rec) {
        rec = {};
        for (const col of MOVEMENT_COLUMNS) rec[col.key] = 0;
        bySection.set(section, rec);
      }
      return rec;
    };

    for (const row of rows) {
      const price = priceByItem.get(row.itemId) ?? 0;
      const section = (sectionByItem.get(row.itemId) as string) ?? "Lainnya";
      const rec = ensure(section);
      for (const col of MOVEMENT_COLUMNS) {
        rec[col.key] += price * row[col.key];
      }
    }

    // Emit sections in canonical order, then any extras (e.g. "Lainnya").
    const ordered: string[] = [
      ...ITEM_SECTIONS.filter((s) => bySection.has(s)),
      ...[...bySection.keys()].filter(
        (s) => !ITEM_SECTIONS.includes(s as ItemSection),
      ),
    ];

    const columnTotals: Record<string, number> = {};
    for (const col of MOVEMENT_COLUMNS) columnTotals[col.key] = 0;
    let grandTotal = 0;

    const sectionRows = ordered.map((section) => {
      const rec = bySection.get(section)!;
      let rowTotal = 0;
      for (const col of MOVEMENT_COLUMNS) {
        columnTotals[col.key] += rec[col.key];
        rowTotal += rec[col.key];
      }
      grandTotal += rowTotal;
      return { section, values: rec, rowTotal };
    });

    return { sectionRows, columnTotals, grandTotal };
  }, [items, rows]);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-[180px] bg-muted/60">
              Klasifikasi
            </TableHead>
            {MOVEMENT_COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "min-w-[104px] whitespace-nowrap text-right",
                  col.isOutflow ? "text-destructive/80" : "text-foreground",
                )}
              >
                {col.label}
              </TableHead>
            ))}
            <TableHead className="min-w-[120px] whitespace-nowrap text-right font-semibold">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sectionRows.map((r) => (
            <TableRow key={r.section}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium">
                {r.section}
              </TableCell>
              {MOVEMENT_COLUMNS.map((col) => (
                <TableCell
                  key={col.key}
                  className="text-right text-xs tabular-nums text-muted-foreground"
                >
                  {formatRupiah(r.values[col.key])}
                </TableCell>
              ))}
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {formatRupiah(r.rowTotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-muted/60 font-semibold uppercase tracking-wide">
              Total
            </TableCell>
            {MOVEMENT_COLUMNS.map((col) => (
              <TableCell
                key={col.key}
                className="text-right text-xs font-semibold tabular-nums"
              >
                {formatRupiah(columnTotals[col.key])}
              </TableCell>
            ))}
            <TableCell className="text-right text-sm font-bold tabular-nums">
              {formatRupiah(grandTotal)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
