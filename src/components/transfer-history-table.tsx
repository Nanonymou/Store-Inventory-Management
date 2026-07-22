"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown } from "lucide-react";
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
import { transferStatusMeta, type StockTransfer } from "@/lib/transfer-mock";

/** Columns the transfer table can be sorted by. */
export type TransferSortKey = "date" | "quantity";

export interface TransferSort {
  key: TransferSortKey;
  dir: "asc" | "desc";
}

interface TransferHistoryTableProps {
  transfers: StockTransfer[];
  sort?: TransferSort;
  onSort?: (key: TransferSortKey) => void;
  /** Render skeleton rows while data loads (for later API wiring). */
  isLoading?: boolean;
  skeletonRows?: number;
}

/**
 * The stock transfer history table: every inter-site movement with its date,
 * item, origin → destination, quantity, status, and reviewer. Date and quantity
 * columns are sortable; a loading skeleton can be shown. Read-only.
 */
export function TransferHistoryTable({
  transfers,
  sort,
  onSort,
  isLoading = false,
  skeletonRows = 5,
}: TransferHistoryTableProps) {
  function SortHeader({
    sortKey,
    children,
    className,
  }: {
    sortKey: TransferSortKey;
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
            <TableHead className="min-w-[130px]">
              <SortHeader sortKey="date">Tanggal</SortHeader>
            </TableHead>
            <TableHead className="min-w-[180px]">Item</TableHead>
            <TableHead className="min-w-[190px]">Asal → Tujuan</TableHead>
            <TableHead className="min-w-[90px] text-right">
              <SortHeader sortKey="quantity" className="justify-end">
                Qty
              </SortHeader>
            </TableHead>
            <TableHead className="min-w-[110px]">Status</TableHead>
            <TableHead className="min-w-[130px]">Pemeriksa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {Array.from({ length: 6 }).map((__, c) => (
                  <TableCell key={c}>
                    <div className="h-4 w-full max-w-[150px] animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading &&
            transfers.map((t) => {
              const status = transferStatusMeta(t.status);
              return (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {format(new Date(t.date), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{t.itemDescription}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {t.itemCode}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium">{t.fromSite}</span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{t.toSite}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(t.quantity)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="muted" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.checkedBy}
                  </TableCell>
                </TableRow>
              );
            })}

          {!isLoading && transfers.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Belum ada transfer.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
