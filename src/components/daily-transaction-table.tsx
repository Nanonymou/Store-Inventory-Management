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
import { Input } from "@/components/ui/input";
import {
  MOVEMENT_COLUMNS,
  computeBalance,
  type DailyStockMovements,
  type DailyStockRow,
  type MasterItem,
} from "@/lib/types";
import { formatNumber, formatRupiah, cn } from "@/lib/utils";

interface DailyTransactionTableProps {
  items: MasterItem[];
  rows: DailyStockRow[];
  /** When false the cells are read-only (past dates / non-input mode). */
  editable?: boolean;
  /** Render each movement cell as its Rupiah value (Price × Qty) instead. */
  showValue?: boolean;
  /** Called when a Storeman edits a movement quantity. */
  onCellChange?: (
    itemId: string,
    key: keyof DailyStockMovements,
    value: number,
  ) => void;
}

/**
 * Editable movement cell. Shows a number input in edit mode; in value mode (or
 * when read-only) it renders formatted text so the money value is easy to read.
 */
function MovementCell({
  value,
  price,
  isOutflow,
  editable,
  showValue,
  auto,
  onChange,
}: {
  value: number;
  price: number;
  isOutflow: boolean;
  editable: boolean;
  showValue: boolean;
  /** Auto-computed column (e.g. Beginning Balance) — never directly editable. */
  auto?: boolean;
  onChange: (next: number) => void;
}) {
  if (showValue) {
    return (
      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
        {formatRupiah(price * value)}
      </TableCell>
    );
  }

  // Auto-computed cells (Beginning Balance) are read-only even in input mode;
  // the value is carried over from the previous day's Balance.
  if (auto) {
    return (
      <TableCell
        title="Otomatis dari Balance hari sebelumnya"
        className="text-right tabular-nums text-muted-foreground"
      >
        {formatNumber(value)}
      </TableCell>
    );
  }

  if (!editable) {
    return (
      <TableCell
        className={cn(
          "text-right tabular-nums",
          value > 0 && isOutflow ? "text-destructive" : "",
        )}
      >
        {formatNumber(value)}
      </TableCell>
    );
  }

  return (
    <TableCell className="p-1">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value;
          const next = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw)));
          onChange(Number.isNaN(next) ? 0 : next);
        }}
        onFocus={(e) => e.target.select()}
        className={cn(
          "h-8 w-[76px] text-right tabular-nums",
          value > 0 && isOutflow ? "text-destructive" : "",
        )}
      />
    </TableCell>
  );
}

/**
 * The spreadsheet-style daily transaction form. Every master item gets a row of
 * movement inputs; the Balance and the Rupiah value summary recompute live as
 * the Storeman types.
 */
export function DailyTransactionTable({
  items,
  rows,
  editable = false,
  showValue = false,
  onCellChange,
}: DailyTransactionTableProps) {
  const rowByItem = React.useMemo(() => {
    const map = new Map<string, DailyStockRow>();
    for (const r of rows) map.set(r.itemId, r);
    return map;
  }, [rows]);

  // Sum of Rupiah value per movement column across all items (live).
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
                {col.auto && (
                  <span
                    className="ml-1 text-[10px] font-normal text-muted-foreground"
                    title="Otomatis dari Balance hari sebelumnya"
                  >
                    (auto)
                  </span>
                )}
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
                  <MovementCell
                    key={col.key}
                    value={row ? row[col.key] : 0}
                    price={item.price}
                    isOutflow={col.isOutflow}
                    editable={editable}
                    showValue={showValue}
                    auto={col.auto}
                    onChange={(next) => onCellChange?.(item.id, col.key, next)}
                  />
                ))}
                <TableCell
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    balance < 0 ? "text-destructive" : "",
                  )}
                >
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
