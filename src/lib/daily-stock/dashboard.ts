import { MOVEMENT_COLUMNS } from "@/lib/types";
import { getDailyStockView, type DailyStockViewRow } from "./service";

export interface DashboardStockFilters {
  siteId: string;
  date: string;
  /** Exact item section, or "all"/undefined for no section filter. */
  section?: string;
  /** Keyword matched against item code / description / brand. */
  query?: string;
}

export interface DashboardStockSummary {
  /** Rupiah value flowing through each movement column (Price × Qty summed). */
  perColumn: Record<string, number>;
  totalIn: number;
  totalOut: number;
  /** totalIn − totalOut. */
  balanceValue: number;
  /** Sum of Balance × Price across the shown rows. */
  totalStockValue: number;
}

export interface DashboardStockResult {
  rows: DailyStockViewRow[];
  summary: DashboardStockSummary;
  counts: { total: number; shown: number };
}

function matchesQuery(row: DailyStockViewRow, q: string): boolean {
  return (
    row.itemCode.toLowerCase().includes(q) ||
    row.description.toLowerCase().includes(q) ||
    (row.brand ?? "").toLowerCase().includes(q)
  );
}

/** Compute the Rupiah value summary over a set of view rows. */
function summarize(rows: DailyStockViewRow[]): DashboardStockSummary {
  const perColumn: Record<string, number> = {};
  for (const col of MOVEMENT_COLUMNS) perColumn[col.key] = 0;

  let totalIn = 0;
  let totalOut = 0;
  let totalStockValue = 0;

  for (const row of rows) {
    for (const col of MOVEMENT_COLUMNS) {
      const value = row.price * row[col.key];
      perColumn[col.key] += value;
      if (col.isOutflow) totalOut += value;
      else totalIn += value;
    }
    totalStockValue += row.balance * row.price;
  }

  return {
    perColumn,
    totalIn,
    totalOut,
    balanceValue: totalIn - totalOut,
    totalStockValue,
  };
}

/**
 * The filtered dashboard stock view for a site + date: the full stock view
 * narrowed by section and keyword, together with the recomputed Rupiah value
 * summary and item counts. Filtering runs server-side so the client receives
 * exactly what it renders.
 */
export async function getDashboardStock(
  filters: DashboardStockFilters,
): Promise<DashboardStockResult> {
  const all = await getDailyStockView(filters.siteId, filters.date);

  const section =
    filters.section && filters.section !== "all" ? filters.section : null;
  const q = filters.query?.trim().toLowerCase() ?? "";

  const rows = all.filter((row) => {
    if (section && row.section !== section) return false;
    if (q && !matchesQuery(row, q)) return false;
    return true;
  });

  return {
    rows,
    summary: summarize(rows),
    counts: { total: all.length, shown: rows.length },
  };
}
