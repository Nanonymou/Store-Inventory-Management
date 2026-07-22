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
  computeBalance,
  type DailyStockRow,
  type ItemSection,
  type MasterItem,
} from "@/lib/types";
import { cn, formatNumber, formatRupiah } from "@/lib/utils";

export interface StockDashboardTableProps {
  items: MasterItem[];
  rows: DailyStockRow[];
}

/**
 * The dashboard's "giant spreadsheet": every item with its full set of movement
 * columns, the auto-computed Balance, and the Rupiah value of that balance.
 * Rows are grouped by the four item sections with a subtotal per section and a
 * grand total in the footer. Read-only — this is a monitoring view.
 */
export function StockDashboardTable({ items, rows }: StockDashboardTableProps) {
  const rowByItem = React.useMemo(() => {
    const map = new Map<string, DailyStockRow>();
    for (const r of rows) map.set(r.itemId, r);
    return map;
  }, [rows]);

  // Group items by section, preserving the canonical section order.
  const groups = React.useMemo(() => {
    const bySection = new Map<ItemSection, MasterItem[]>();
    for (const section of ITEM_SECTIONS) bySection.set(section, []);
    for (const item of items) {
      const list = bySection.get(item.section);
      if (list) list.push(item);
    }
    return ITEM_SECTIONS.map((section) => ({
      section,
      items: bySection.get(section) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [items]);

  const balanceOf = React.useCallback(
    (item: MasterItem) => {
      const row = rowByItem.get(item.id);
      return row ? computeBalance(row) : 0;
    },
    [rowByItem],
  );

  const grandTotalValue = items.reduce(
    (sum, item) => sum + balanceOf(item) * item.price,
    0,
  );

  const COLSPAN_LEAD = 7; // No + Code + Desc + Brand + Size + Unit + Price
  const TOTAL_COLS = COLSPAN_LEAD + MOVEMENT_COLUMNS.length + 2; // + Balance + Value

  let runningIndex = 0;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/70">
          <TableRow>
            <TableHead className="w-10 text-center">No</TableHead>
            <TableHead className="min-w-[96px]">Item Code</TableHead>
            <TableHead className="min-w-[170px]">Description</TableHead>
            <TableHead className="min-w-[110px]">Brand</TableHead>
            <TableHead className="min-w-[70px]">Size</TableHead>
            <TableHead className="min-w-[64px]">Unit</TableHead>
            <TableHead className="min-w-[110px] text-right">Price</TableHead>
            {MOVEMENT_COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "min-w-[84px] text-right",
                  col.isOutflow ? "text-destructive/80" : "text-foreground",
                )}
              >
                {col.label}
              </TableHead>
            ))}
            <TableHead className="min-w-[92px] text-right font-semibold">
              Balance
            </TableHead>
            <TableHead className="min-w-[120px] text-right font-semibold">
              Nilai (Rp)
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {groups.map((group) => {
            const sectionValue = group.items.reduce(
              (sum, item) => sum + balanceOf(item) * item.price,
              0,
            );
            return (
              <React.Fragment key={group.section}>
                <TableRow className="bg-accent/50 hover:bg-accent/50">
                  <TableCell
                    colSpan={TOTAL_COLS}
                    className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.section} · {group.items.length} item
                  </TableCell>
                </TableRow>

                {group.items.map((item) => {
                  const row = rowByItem.get(item.id);
                  const balance = balanceOf(item);
                  runningIndex += 1;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-muted-foreground">
                        {runningIndex}
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
                      <TableCell
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          balance < 0 ? "text-destructive" : "",
                        )}
                      >
                        {formatNumber(balance)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRupiah(balance * item.price)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={TOTAL_COLS - 1}
                    className="text-right text-xs font-medium text-muted-foreground"
                  >
                    Subtotal {group.section}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums">
                    {formatRupiah(sectionValue)}
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}

          {groups.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={TOTAL_COLS}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Tidak ada item untuk ditampilkan.
              </TableCell>
            </TableRow>
          )}
        </TableBody>

        <TableFooter>
          <TableRow>
            <TableCell
              colSpan={TOTAL_COLS - 1}
              className="text-right text-sm font-semibold"
            >
              Total Nilai Persediaan
            </TableCell>
            <TableCell className="text-right text-sm font-bold tabular-nums">
              {formatRupiah(grandTotalValue)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
