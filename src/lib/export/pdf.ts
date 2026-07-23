import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ITEM_SECTIONS,
  MOVEMENT_COLUMNS,
  type DailyStockRow,
  type ItemSection,
  type MasterItem,
} from "@/lib/types";
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

const HEADER_FILL: [number, number, number] = [30, 41, 59];
const TOTAL_FILL: [number, number, number] = [226, 232, 240];

/** Rupiah value flowing through each movement column, plus in/out totals. */
function computeValueSummary(items: MasterItem[], rows: DailyStockRow[]) {
  const priceByItem = new Map(items.map((i) => [i.id, i.price]));
  const perColumn: Record<string, number> = {};
  for (const col of MOVEMENT_COLUMNS) perColumn[col.key] = 0;

  let totalIn = 0;
  let totalOut = 0;
  for (const row of rows) {
    const price = priceByItem.get(row.itemId) ?? 0;
    for (const col of MOVEMENT_COLUMNS) {
      const value = price * row[col.key];
      perColumn[col.key] += value;
      if (col.isOutflow) totalOut += value;
      else totalIn += value;
    }
  }
  return { perColumn, totalIn, totalOut, balanceValue: totalIn - totalOut };
}

/** Rupiah value per (section × movement) plus row/column totals — the matrix. */
function computeSectionMatrix(items: MasterItem[], rows: DailyStockRow[]) {
  const priceByItem = new Map(items.map((i) => [i.id, i.price]));
  const sectionByItem = new Map(items.map((i) => [i.id, i.section]));

  const bySection = new Map<string, Record<string, number>>();
  const ensure = (section: string) => {
    let rec = bySection.get(section);
    if (!rec) {
      rec = {};
      for (const col of MOVEMENT_COLUMNS) rec[col.key] = 0;
      bySection.set(section, rec);
    }
    return rec;
  };

  for (const row of rows) {
    const price = priceByItem.get(row.itemId) ?? 0;
    const section = (sectionByItem.get(row.itemId) as string) ?? "Lainnya";
    const rec = ensure(section);
    for (const col of MOVEMENT_COLUMNS) rec[col.key] += price * row[col.key];
  }

  const ordered: string[] = [
    ...ITEM_SECTIONS.filter((s) => bySection.has(s)),
    ...[...bySection.keys()].filter(
      (s) => !ITEM_SECTIONS.includes(s as ItemSection),
    ),
  ];

  const columnTotals: Record<string, number> = {};
  for (const col of MOVEMENT_COLUMNS) columnTotals[col.key] = 0;
  let grandTotal = 0;

  const sections = ordered.map((section) => {
    const rec = bySection.get(section)!;
    let rowTotal = 0;
    for (const col of MOVEMENT_COLUMNS) {
      columnTotals[col.key] += rec[col.key];
      rowTotal += rec[col.key];
    }
    grandTotal += rowTotal;
    return { section, values: rec, rowTotal };
  });

  return { sections, columnTotals, grandTotal };
}

/** Y after the last drawn autotable. */
function lastY(doc: jsPDF): number {
  return (
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 0
  );
}

/**
 * Export the dashboard to a print-ready PDF (jsPDF + autotable) that mirrors the
 * on-screen view in detail: a Ringkasan Nilai block (money in/out/balance and
 * per-stream values), the Resume Nilai per Klasifikasi matrix, and the full
 * stock table. Landscape A4 to fit the wide layout. Runs client-side only.
 */
export function exportStockToPdf(
  items: MasterItem[],
  rows: DailyStockRow[],
  meta: StockReportMeta,
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const movementLabels = MOVEMENT_COLUMNS.map((c) => c.label);

  doc.setFontSize(14);
  doc.text("Laporan Stok — SIM", 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Lokasi: ${meta.siteName}    Tanggal: ${meta.date}`, 40, 58);
  doc.setTextColor(0);

  // --- 1. Ringkasan Nilai (headline in/out/balance) ------------------------
  const summary = computeValueSummary(items, rows);
  doc.setFontSize(11);
  doc.text("Ringkasan Nilai", 40, 78);
  autoTable(doc, {
    startY: 86,
    head: [["Nilai Masuk", "Nilai Keluar", "Nilai Balance"]],
    body: [
      [
        formatRupiah(summary.totalIn),
        formatRupiah(summary.totalOut),
        formatRupiah(summary.balanceValue),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 4, halign: "right" },
    headStyles: { fillColor: HEADER_FILL, halign: "right" },
    theme: "grid",
    tableWidth: 400,
  });

  // Per-stream breakdown (one value row under the movement labels).
  autoTable(doc, {
    startY: lastY(doc) + 8,
    head: [movementLabels],
    body: [MOVEMENT_COLUMNS.map((c) => formatRupiah(summary.perColumn[c.key]))],
    styles: { fontSize: 7, cellPadding: 2, halign: "right" },
    headStyles: { fillColor: HEADER_FILL, fontSize: 7 },
    theme: "grid",
  });

  // --- 2. Resume Nilai per Klasifikasi (section × movement matrix) ----------
  const matrix = computeSectionMatrix(items, rows);
  let y = lastY(doc) + 20;
  if (y > doc.internal.pageSize.getHeight() - 120) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(11);
  doc.text("Resume Nilai per Klasifikasi", 40, y);
  autoTable(doc, {
    startY: y + 8,
    head: [["Klasifikasi", ...movementLabels, "Total"]],
    body: matrix.sections.map((s) => [
      s.section,
      ...MOVEMENT_COLUMNS.map((c) => formatRupiah(s.values[c.key])),
      formatRupiah(s.rowTotal),
    ]),
    foot: [
      [
        "TOTAL",
        ...MOVEMENT_COLUMNS.map((c) => formatRupiah(matrix.columnTotals[c.key])),
        formatRupiah(matrix.grandTotal),
      ],
    ],
    styles: { fontSize: 7, cellPadding: 2, halign: "right" },
    headStyles: { fillColor: HEADER_FILL, fontSize: 7 },
    footStyles: { fillColor: TOTAL_FILL, textColor: 20, fontStyle: "bold" },
    columnStyles: { 0: { halign: "left" } },
    theme: "grid",
  });

  // --- 3. Tabel Stok Lengkap ------------------------------------------------
  let y2 = lastY(doc) + 20;
  if (y2 > doc.internal.pageSize.getHeight() - 120) {
    doc.addPage();
    y2 = 40;
  }
  doc.setFontSize(11);
  doc.text("Tabel Stok Lengkap", 40, y2);

  const body = buildStockReportRows(items, rows).map((row) =>
    row.map((cell, i) =>
      i === PRICE_COL || i === VALUE_COL ? formatRupiah(Number(cell)) : cell,
    ),
  );

  autoTable(doc, {
    head: [STOCK_REPORT_COLUMNS],
    body,
    startY: y2 + 8,
    styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: HEADER_FILL, fontSize: 6 },
    columnStyles: {
      2: { cellWidth: 90 }, // Description
      [PRICE_COL]: { halign: "right" },
      [VALUE_COL]: { halign: "right" },
    },
    theme: "grid",
  });

  doc.save(`${stockReportFileName(meta)}.pdf`);
}
