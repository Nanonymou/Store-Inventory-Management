import {
  MOVEMENT_COLUMNS,
  computeBalance,
  type DailyStockRow,
  type MasterItem,
} from "@/lib/types";

/** Column headers for the stock report, matching the dashboard table order. */
export const STOCK_REPORT_COLUMNS = [
  "No",
  "Item Code",
  "Description",
  "Section",
  "Brand",
  "Size",
  "Unit",
  "Price",
  ...MOVEMENT_COLUMNS.map((c) => c.label),
  "Balance",
  "Nilai (Rp)",
];

export interface StockReportMeta {
  siteName: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
}

/**
 * Flatten items + their daily rows into a matrix of primitive cell values, in
 * the same column order as STOCK_REPORT_COLUMNS. Shared by the Excel and PDF
 * exporters so both stay in sync with the on-screen table.
 */
export function buildStockReportRows(
  items: MasterItem[],
  rows: DailyStockRow[],
): (string | number)[][] {
  const rowByItem = new Map(rows.map((r) => [r.itemId, r]));

  return items.map((item, index) => {
    const row = rowByItem.get(item.id);
    const balance = row ? computeBalance(row) : 0;
    return [
      index + 1,
      item.itemCode,
      item.description,
      item.section,
      item.brand ?? "",
      item.size ?? "",
      item.unit ?? "",
      item.price,
      ...MOVEMENT_COLUMNS.map((c) => (row ? row[c.key] : 0)),
      balance,
      balance * item.price,
    ];
  });
}

/** A filesystem-safe report file name, e.g. "stok_Site-A_2026-07-22". */
export function stockReportFileName(meta: StockReportMeta): string {
  const safeSite = meta.siteName.replace(/[^\w-]+/g, "-");
  return `stok_${safeSite}_${meta.date}`;
}
