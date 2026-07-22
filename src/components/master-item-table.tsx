"use client";

import * as React from "react";
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
import type { MasterItem } from "@/lib/types";
import { cn, formatRupiah } from "@/lib/utils";

/** Columns the master item table can be sorted by. */
export type MasterItemSortKey =
  | "itemCode"
  | "description"
  | "brand"
  | "price"
  | "section";

export interface MasterItemSort {
  key: MasterItemSortKey;
  dir: "asc" | "desc";
}

interface MasterItemTableProps {
  items: MasterItem[];
  /** Current sort, used to render the header indicators. */
  sort?: MasterItemSort;
  /** Called when a sortable header is clicked. */
  onSort?: (key: MasterItemSortKey) => void;
  /** Optional per-row action cell (edit/delete), rendered in the last column. */
  renderActions?: (item: MasterItem) => React.ReactNode;
}

/**
 * The master item catalog table (Admin). Lists Item Code, Description, Brand,
 * Size, Unit, Price, and Section. Sortable columns show a direction indicator
 * and call `onSort`. An optional actions column hosts edit/delete controls.
 */
export function MasterItemTable({
  items,
  sort,
  onSort,
  renderActions,
}: MasterItemTableProps) {
  function SortHeader({
    sortKey,
    children,
    className,
  }: {
    sortKey: MasterItemSortKey;
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
            <TableHead className="w-10 text-center">No</TableHead>
            <TableHead className="min-w-[110px]">
              <SortHeader sortKey="itemCode">Item Code</SortHeader>
            </TableHead>
            <TableHead className="min-w-[180px]">
              <SortHeader sortKey="description">Description</SortHeader>
            </TableHead>
            <TableHead className="min-w-[120px]">
              <SortHeader sortKey="brand">Brand</SortHeader>
            </TableHead>
            <TableHead className="min-w-[80px]">Size</TableHead>
            <TableHead className="min-w-[70px]">Unit</TableHead>
            <TableHead className="min-w-[120px] text-right">
              <SortHeader sortKey="price" className="justify-end">
                Price
              </SortHeader>
            </TableHead>
            <TableHead className="min-w-[180px]">
              <SortHeader sortKey="section">Section</SortHeader>
            </TableHead>
            {renderActions && (
              <TableHead className="w-[120px] text-right">Aksi</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="text-center text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {item.itemCode}
              </TableCell>
              <TableCell className="font-medium">{item.description}</TableCell>
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
              <TableCell>
                <Badge variant="muted">{item.section}</Badge>
              </TableCell>
              {renderActions && (
                <TableCell className="text-right">
                  {renderActions(item)}
                </TableCell>
              )}
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={renderActions ? 9 : 8}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Belum ada item.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
