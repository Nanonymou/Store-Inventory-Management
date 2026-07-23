import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DailyStockRow, MasterItem } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import {
  STOCK_REPORT_COLUMNS,
  buildStockReportRows,
  stockReportFileName,
  type StockReportMeta,
} from "./stock-report";

// Column indices that hold money and should be rendered as Rupiah.
const PRICE_COL = 7;
const VALUE_COL = STOCK_REPORT_COLUMNS.length - 1;

/**
 * Export the current stock view to a print-ready PDF (jsPDF + autotable). Uses a
 * landscape A4 layout to fit the wide table, with a title/meta block and the
 * money columns formatted as Rupiah. Runs client-side only.
 */
export function exportStockToPdf(
  items: MasterItem[],
  rows: DailyStockRow[],
  meta: StockReportMeta,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(14);
  doc.text("Laporan Stok — SIM", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Site: ${meta.siteName}    Tanggal: ${meta.date}`, 40, 58);
  doc.setTextColor(0);

  const body = buildStockReportRows(items, rows).map((row) =>
    row.map((cell, i) =>
      i === PRICE_COL || i === VALUE_COL ? formatRupiah(Number(cell)) : cell,
    ),
  );

  autoTable(doc, {
    head: [STOCK_REPORT_COLUMNS],
    body,
    startY: 74,
    styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [30, 41, 59], fontSize: 6 },
    columnStyles: {
      2: { cellWidth: 90 }, // Description
      [PRICE_COL]: { halign: "right" },
      [VALUE_COL]: { halign: "right" },
    },
    theme: "grid",
  });

  doc.save(`${stockReportFileName(meta)}.pdf`);
}
