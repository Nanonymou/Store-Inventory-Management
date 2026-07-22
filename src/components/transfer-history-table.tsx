"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import {
  transferStatusMeta,
  type StockTransfer,
} from "@/lib/transfer-mock";

/**
 * The stock transfer history table: every inter-site movement with its date,
 * item, origin → destination, quantity, status, and reviewer. Read-only.
 */
export function TransferHistoryTable({
  transfers,
}: {
  transfers: StockTransfer[];
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="min-w-[130px]">Tanggal</TableHead>
            <TableHead className="min-w-[180px]">Item</TableHead>
            <TableHead className="min-w-[190px]">Asal → Tujuan</TableHead>
            <TableHead className="min-w-[90px] text-right">Qty</TableHead>
            <TableHead className="min-w-[110px]">Status</TableHead>
            <TableHead className="min-w-[130px]">Pemeriksa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((t) => {
            const status = transferStatusMeta(t.status);
            return (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                  {format(new Date(t.date), "dd MMM yyyy", { locale: localeId })}
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
          {transfers.length === 0 && (
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
