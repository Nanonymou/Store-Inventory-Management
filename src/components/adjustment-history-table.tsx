"use client";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
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

/**
 * The stock adjustment (opname) history table: date, site, item, before →
 * after, signed difference, reason, and who adjusted it. Read-only.
 */
export function AdjustmentHistoryTable({
  adjustments,
}: {
  adjustments: StockAdjustment[];
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className="min-w-[120px]">Tanggal</TableHead>
            <TableHead className="min-w-[90px]">Site</TableHead>
            <TableHead className="min-w-[180px]">Item</TableHead>
            <TableHead className="min-w-[80px] text-right">Sebelum</TableHead>
            <TableHead className="min-w-[80px] text-right">Sesudah</TableHead>
            <TableHead className="min-w-[90px] text-right">Selisih</TableHead>
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
