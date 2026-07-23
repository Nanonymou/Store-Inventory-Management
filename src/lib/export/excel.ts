import * as XLSX from "xlsx";
import type { DailyStockRow, MasterItem } from "@/lib/types";
import {
  STOCK_REPORT_COLUMNS,
  buildStockReportRows,
  stockReportFileName,
  type StockReportMeta,
} from "./stock-report";

/**
 * Export the current stock view to an .xlsx file (SheetJS). Builds a worksheet
 * with a small title block, the column header row, and one row per item, then
 * triggers a browser download. Runs client-side only.
 */
export function exportStockToExcel(
  items: MasterItem[],
  rows: DailyStockRow[],
  meta: StockReportMeta,
): void {
  const dataRows = buildStockReportRows(items, rows);

  const aoa: (string | number)[][] = [
    ["Laporan Stok — SIM"],
    [`Site: ${meta.siteName}`, `Tanggal: ${meta.date}`],
    [],
    STOCK_REPORT_COLUMNS,
    ...dataRows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Reasonable default widths so the sheet is readable on open.
  worksheet["!cols"] = STOCK_REPORT_COLUMNS.map((label, i) => {
    if (i === 2) return { wch: 26 }; // Description
    if (i === 1 || i === 3 || i === 4) return { wch: 16 };
    if (i === 7 || label === "Nilai (Rp)") return { wch: 14 };
    return { wch: 11 };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Stok");
  XLSX.writeFile(workbook, `${stockReportFileName(meta)}.xlsx`);
}
