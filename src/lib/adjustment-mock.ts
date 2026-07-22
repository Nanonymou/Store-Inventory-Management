/** Reasons for a stock adjustment (opname). */
export const ADJUSTMENT_REASONS = [
  "Rusak",
  "Hilang",
  "Kadaluarsa",
  "Kesalahan Input",
  "Selisih Opname",
] as const;

export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

/** A stock adjustment record (mock shape mirrors the future table). */
export interface StockAdjustment {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  site: string;
  itemCode: string;
  itemDescription: string;
  /** Stock before the adjustment. */
  before: number;
  /** Stock after the adjustment. */
  after: number;
  reason: AdjustmentReason;
  note: string;
  adjustedBy: string;
}

/** Signed difference (after − before): positive is a surplus, negative a loss. */
export function adjustmentDifference(a: StockAdjustment): number {
  return a.after - a.before;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** A spread of mock adjustments across sites, items, and reasons. */
export const MOCK_ADJUSTMENTS: StockAdjustment[] = [
  {
    id: "adj-01",
    date: daysAgo(0),
    site: "Site A",
    itemCode: "FRZ-001",
    itemDescription: "Beef Sirloin",
    before: 40,
    after: 38,
    reason: "Rusak",
    note: "2 unit rusak saat penyimpanan.",
    adjustedBy: "Admin Pusat",
  },
  {
    id: "adj-02",
    date: daysAgo(1),
    site: "Site C",
    itemCode: "VEG-001",
    itemDescription: "Tomato Fresh",
    before: 55,
    after: 50,
    reason: "Kadaluarsa",
    note: "5 unit lewat masa simpan.",
    adjustedBy: "Admin Pusat",
  },
  {
    id: "adj-03",
    date: daysAgo(2),
    site: "Site A",
    itemCode: "DRY-002",
    itemDescription: "All-Purpose Flour",
    before: 30,
    after: 32,
    reason: "Kesalahan Input",
    note: "Koreksi salah hitung penerimaan.",
    adjustedBy: "Admin Pusat",
  },
  {
    id: "adj-04",
    date: daysAgo(4),
    site: "Site E",
    itemCode: "CHM-001",
    itemDescription: "Dishwash Liquid",
    before: 22,
    after: 20,
    reason: "Hilang",
    note: "Selisih hasil opname bulanan.",
    adjustedBy: "Admin Pusat",
  },
  {
    id: "adj-05",
    date: daysAgo(6),
    site: "Site B",
    itemCode: "FRZ-002",
    itemDescription: "Chicken Breast",
    before: 48,
    after: 45,
    reason: "Selisih Opname",
    note: "Penyesuaian stok fisik.",
    adjustedBy: "Admin Pusat",
  },
];
