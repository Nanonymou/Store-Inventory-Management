"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";
import {
  adjustmentDifference,
  type StockAdjustment,
} from "@/lib/adjustment-mock";

/** Columns the adjustment history can be sorted by. */
export type AdjustmentSortKey = "date" | "difference";

export interface AdjustmentSort {
  key: AdjustmentSortKey;
  dir: "asc" | "desc";
}

interface AdjustmentHistoryTableProps {
  adjustments: StockAdjustment[];
  sort?: AdjustmentSort;
  onSort?: (key: AdjustmentSortKey) => void;
}

/**
 * The stock adjustment (opname) history table: date, site, item, before →
 * after, signed difference, reason, and who adjusted it. Date and difference
 * columns are sortable. Read-only.
 */
export function AdjustmentHistoryTable({
  adjustments,
  sort,
  onSort,
}: AdjustmentHistoryTableProps) {
  function SortHeader({
    sortKey,
    children,
    className,
  }: {
    sortKey: AdjustmentSortKey;
    children: React.ReactNode;
    className?: string;
  }) {
    if (!onSort) return <>{children}</>;
    const active = sort?.key === sortKey;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
          className,
        )}
      >
        {children}
        <Icon className="size-3.5" />
      </button>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="min-w-[120px]">
              <SortHeader sortKey="date">Tanggal</SortHeader>
            </TableHead>
            <TableHead className="min-w-[90px]">Site</TableHead>
            <TableHead className="min-w-[180px]">Item</TableHead>
            <TableHead className="min-w-[80px] text-right">Sebelum</TableHead>
            <TableHead className="min-w-[80px] text-right">Sesudah</TableHead>
            <TableHead className="min-w-[90px] text-right">
              <SortHeader sortKey="difference" className="justify-end">
                Selisih
              </SortHeader>
            </TableHead>
            <TableHead className="min-w-[120px]">Alasan</TableHead>
            <TableHead className="min-w-[130px]">Oleh</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {adjustments.map((a) => {
            const diff = adjustmentDifference(a);
            return (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  {format(new Date(a.date), "dd MMM yyyy", { locale: localeId })}
                </TableCell>
                <TableCell className="text-sm">{a.site}</TableCell>
                <TableCell>
                  <div className="font-medium">{a.itemDescription}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {a.itemCode}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatNumber(a.before)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatNumber(a.after)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    diff > 0
                      ? "text-emerald-600"
                      : diff < 0
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)}
                </TableCell>
                <TableCell>
                  <Badge variant="muted">{a.reason}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.adjustedBy}
                </TableCell>
              </TableRow>
            );
          })}
          {adjustments.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Belum ada penyesuaian.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
