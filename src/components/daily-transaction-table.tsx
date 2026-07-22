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
  MOVEMENT_COLUMNS,
  computeBalance,
  type DailyStockRow,
  type MasterItem,
} from "@/lib/types";
import { formatNumber, formatRupiah, cn } from "@/lib/utils";

interface DailyTransactionTableProps {
  items: MasterItem[];
  rows: DailyStockRow[];
}

/**
 * The spreadsheet-style daily transaction table. Shows every master item with
 * its movement columns and the auto-computed Balance. A footer summarises the
 * Rupiah value flowing through each movement column (Price × Qty).
 */
export function DailyTransactionTable({
  items,
  rows,
}: DailyTransactionTableProps) {
  const rowByItem = React.useMemo(() => {
    const map = new Map<string, DailyStockRow>();
    for (const r of rows) map.set(r.itemId, r);
    return map;
  }, [rows]);

  // Sum of Rupiah value per movement column across all items.
  const valueTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const col of MOVEMENT_COLUMNS) totals[col.key] = 0;
    for (const item of items) {
      const row = rowByItem.get(item.id);
      if (!row) continue;
      for (const col of MOVEMENT_COLUMNS) {
        totals[col.key] += item.price * row[col.key];
      }
    }
    return totals;
  }, [items, rowByItem]);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/60">
          <TableRow>
            <TableHead className="w-10 text-center">No</TableHead>
            <TableHead className="min-w-[96px]">Item Code</TableHead>
            <TableHead className="min-w-[160px]">Description</TableHead>
            <TableHead className="min-w-[110px]">Brand</TableHead>
            <TableHead className="min-w-[70px]">Size</TableHead>
            <TableHead className="min-w-[64px]">Unit</TableHead>
            <TableHead className="min-w-[110px] text-right">Price</TableHead>
            {MOVEMENT_COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "min-w-[86px] text-right",
                  col.isOutflow ? "text-destructive/80" : "text-foreground",
                )}
              >
                {col.label}
              </TableHead>
            ))}
            <TableHead className="min-w-[96px] text-right font-semibold">
              Balance
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const row = rowByItem.get(item.id);
            const balance = row ? computeBalance(row) : 0;
            return (
              <TableRow key={item.id}>
                <TableCell className="text-center text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {item.itemCode}
                </TableCell>
                <TableCell className="font-medium">
                  {item.description}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.brand}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.size}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.unit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatRupiah(item.price)}
                </TableCell>
                {MOVEMENT_COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "text-right tabular-nums",
                      row && row[col.key] > 0 && col.isOutflow
                        ? "text-destructive"
                        : "",
                    )}
                  >
                    {row ? formatNumber(row[col.key]) : "-"}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(balance)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell
              colSpan={7}
              className="text-right text-xs uppercase tracking-wide text-muted-foreground"
            >
              Nilai (Rp) per kolom
            </TableCell>
            {MOVEMENT_COLUMNS.map((col) => (
              <TableCell
                key={col.key}
                className="text-right text-xs tabular-nums"
              >
                {formatRupiah(valueTotals[col.key])}
              </TableCell>
            ))}
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
