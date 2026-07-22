"use client";

import * as React from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportStockToExcel } from "@/lib/export/excel";
import type { StockReportMeta } from "@/lib/export/stock-report";
import type { DailyStockRow, MasterItem } from "@/lib/types";

interface ExportButtonsProps {
  items: MasterItem[];
  rows: DailyStockRow[];
  meta: StockReportMeta;
}

/**
 * Report export actions for the dashboard. Exports the currently displayed
 * (already filtered) stock view. Excel export is available here; PDF is added
 * alongside it.
 */
export function ExportButtons({ items, rows, meta }: ExportButtonsProps) {
  const disabled = items.length === 0;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => exportStockToExcel(items, rows, meta)}
      >
        <FileSpreadsheet className="size-4" />
        Export Excel
      </Button>
    </div>
  );
}
