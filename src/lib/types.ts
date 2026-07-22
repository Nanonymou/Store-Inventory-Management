/** The four item sections used across the app. */
export const ITEM_SECTIONS = [
  "Frozen",
  "Dry Goods & Dairy",
  "Fresh Vegetable & Fruits",
  "Chemical & Consumable",
] as const;

export type ItemSection = (typeof ITEM_SECTIONS)[number];

/** Access roles. Storeman is site-bound; Admin has global access. */
export type UserRole = "admin" | "storeman";

/** The signed-in user's session context (mocked on the frontend for now). */
export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  /** Bound site for a Storeman; null for an Admin (all sites). */
  siteId: string | null;
}

/** Master item — the catalog record controlled by Admin. */
export interface MasterItem {
  id: string;
  itemCode: string;
  description: string;
  brand: string;
  size: string;
  unit: string;
  price: number;
  section: ItemSection;
}

/** One inventory storage location. */
export interface Site {
  id: string;
  name: string;
  location: string;
}

/**
 * The transaction (mutation) quantity columns of a daily stock row.
 * Balance is derived and therefore not part of the editable inputs.
 */
export interface DailyStockMovements {
  begBalance: number;
  receiving: number;
  regular: number;
  snack: number;
  backcharge: number;
  hkl: number;
  event: number;
  ent: number;
  toQty: number;
  spoil: number;
}

/** A full daily stock record for a single item at a single site on a date. */
export interface DailyStockRow extends DailyStockMovements {
  id: string;
  itemId: string;
  siteId: string;
  /** ISO date string, e.g. "2026-07-22". */
  date: string;
}

/** The movement columns rendered in the daily transaction table, in order. */
export const MOVEMENT_COLUMNS: {
  key: keyof DailyStockMovements;
  label: string;
  /** Whether the movement subtracts from the balance. */
  isOutflow: boolean;
  /** Auto-computed (not directly editable) — e.g. Beginning Balance. */
  auto?: boolean;
}[] = [
  { key: "begBalance", label: "Beg. Balance", isOutflow: false, auto: true },
  { key: "receiving", label: "Receiving", isOutflow: false },
  { key: "regular", label: "Regular", isOutflow: true },
  { key: "snack", label: "Snack", isOutflow: true },
  { key: "backcharge", label: "Backcharge", isOutflow: true },
  { key: "hkl", label: "HKL", isOutflow: true },
  { key: "event", label: "Event", isOutflow: true },
  { key: "ent", label: "Ent", isOutflow: true },
  { key: "toQty", label: "TO", isOutflow: true },
  { key: "spoil", label: "Spoil", isOutflow: true },
];

/**
 * Balance = Beginning Balance + Receiving
 *           − Regular − Snack − Backcharge − HKL − Event − Ent − TO − Spoil.
 */
export function computeBalance(m: DailyStockMovements): number {
  return (
    m.begBalance +
    m.receiving -
    m.regular -
    m.snack -
    m.backcharge -
    m.hkl -
    m.event -
    m.ent -
    m.toQty -
    m.spoil
  );
}
