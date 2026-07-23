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
  ITEM_SECTIONS,
  MOVEMENT_COLUMNS,
  computeBalance,
  type DailyStockMovements,
  type DailyStockRow,
  type ItemSection,
  type MasterItem,
} from "@/lib/types";
import { formatNumber, formatRupiah, cn } from "@/lib/utils";

/*
 * Frozen (sticky) left columns — the item identity (No, Item Code, Description)
 * stays pinned while the movement columns scroll horizontally, so it is always
 * clear which item and which column a number is being typed into. The `left-*`
 * offsets must match the cumulative widths: No = 44px, Item Code = 104px (→
 * left 44px), Description → left 148px. Header cells sit above the body
 * (z-30 > z-10) and use a solid background so scrolling content never shows
 * through; body cells match the row's hover tint via group-hover.
 */
const FREEZE_NO_HEAD = "sticky left-0 z-30 w-11 min-w-11 bg-muted";
const FREEZE_CODE_HEAD = "sticky left-11 z-30 w-[104px] min-w-[104px] bg-muted";
const FREEZE_DESC_HEAD =
  "sticky left-[148px] z-30 w-[190px] min-w-[190px] border-r bg-muted";
const FREEZE_NO_CELL =
  "sticky left-0 z-10 w-11 min-w-11 bg-background group-hover:bg-muted/50";
const FREEZE_CODE_CELL =
  "sticky left-11 z-10 w-[104px] min-w-[104px] bg-background group-hover:bg-muted/50";
const FREEZE_DESC_CELL =
  "sticky left-[148px] z-10 w-[190px] min-w-[190px] border-r bg-background group-hover:bg-muted/50";

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

  // Group items by section (in canonical order) so the input form mirrors the
  // dashboard's grouped layout.
  const groups = React.useMemo(() => {
    const bySection = new Map<ItemSection, MasterItem[]>();
    for (const section of ITEM_SECTIONS) bySection.set(section, []);
    const other: MasterItem[] = [];
    for (const item of items) {
      const list = bySection.get(item.section);
      if (list) list.push(item);
      else other.push(item);
    }
    const result = ITEM_SECTIONS.map((section) => ({
      section: section as string,
      items: bySection.get(section) ?? [],
    })).filter((g) => g.items.length > 0);
    if (other.length > 0) result.push({ section: "Lainnya", items: other });
    return result;
  }, [items]);

  // Total column count (No + Code + Desc + Brand + Size + Unit + Price + moves + Balance).
  const totalCols = 7 + MOVEMENT_COLUMNS.length + 1;
  let rowIndex = 0;

  return (
    <div className="rounded-lg border">
      <Table containerClassName="max-h-[70vh]">
        <TableHeader className="sticky top-0 z-20 bg-muted">
          <TableRow>
            <TableHead className={cn(FREEZE_NO_HEAD, "text-center")}>
              No
            </TableHead>
            <TableHead className={FREEZE_CODE_HEAD}>Item Code</TableHead>
            <TableHead className={FREEZE_DESC_HEAD}>Description</TableHead>
            <TableHead className="min-w-[110px]">Brand</TableHead>
            <TableHead className="min-w-[70px]">Size</TableHead>
            <TableHead className="min-w-[64px]">Unit</TableHead>
            <TableHead className="min-w-[110px] text-right">Price</TableHead>
            {MOVEMENT_COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "min-w-[92px] whitespace-nowrap text-right",
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
            <TableHead className="min-w-[96px] whitespace-nowrap text-right font-semibold">
              Balance
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <React.Fragment key={group.section}>
              <TableRow className="bg-accent/50 hover:bg-accent/50">
                <TableCell
                  colSpan={totalCols}
                  className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <span className="sticky left-2 inline-block">
                    {group.section} · {group.items.length} item
                  </span>
                </TableCell>
              </TableRow>
              {group.items.map((item) => {
                const row = rowByItem.get(item.id);
                const balance = row ? computeBalance(row) : 0;
                rowIndex += 1;
                return (
                  <TableRow key={item.id} className="group">
                    <TableCell
                      className={cn(FREEZE_NO_CELL, "text-center text-muted-foreground")}
                    >
                      {rowIndex}
                    </TableCell>
                    <TableCell
                      className={cn(
                        FREEZE_CODE_CELL,
                        "whitespace-nowrap font-mono text-xs",
                      )}
                    >
                      {item.itemCode}
                    </TableCell>
                    <TableCell className={cn(FREEZE_DESC_CELL, "font-medium")}>
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
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
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
                        onChange={(next) =>
                          onCellChange?.(item.id, col.key, next)
                        }
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
            </React.Fragment>
          ))}
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
