"use client";

import * as React from "react";
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
import { formatRupiah } from "@/lib/utils";

interface MasterItemTableProps {
  items: MasterItem[];
  /** Optional per-row action cell (edit/delete), rendered in the last column. */
  renderActions?: (item: MasterItem) => React.ReactNode;
}

/**
 * The master item catalog table (Admin). Lists Item Code, Description, Brand,
 * Size, Unit, Price, and Section. An optional actions column hosts edit/delete
 * controls when provided.
 */
export function MasterItemTable({ items, renderActions }: MasterItemTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="w-10 text-center">No</TableHead>
            <TableHead className="min-w-[110px]">Item Code</TableHead>
            <TableHead className="min-w-[180px]">Description</TableHead>
            <TableHead className="min-w-[120px]">Brand</TableHead>
            <TableHead className="min-w-[80px]">Size</TableHead>
            <TableHead className="min-w-[70px]">Unit</TableHead>
            <TableHead className="min-w-[120px] text-right">Price</TableHead>
            <TableHead className="min-w-[180px]">Section</TableHead>
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
