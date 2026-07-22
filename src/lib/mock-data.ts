import type { DailyStockRow, MasterItem, Site } from "./types";

/** 11 storage sites as described in the PRD. */
export const MOCK_SITES: Site[] = [
  { id: "site-01", name: "Site A", location: "Jakarta Pusat" },
  { id: "site-02", name: "Site B", location: "Jakarta Barat" },
  { id: "site-03", name: "Site C", location: "Jakarta Selatan" },
  { id: "site-04", name: "Site D", location: "Jakarta Timur" },
  { id: "site-05", name: "Site E", location: "Jakarta Utara" },
  { id: "site-06", name: "Site F", location: "Bekasi" },
  { id: "site-07", name: "Site G", location: "Depok" },
  { id: "site-08", name: "Site H", location: "Tangerang" },
  { id: "site-09", name: "Site I", location: "Bogor" },
  { id: "site-10", name: "Site J", location: "Bandung" },
  { id: "site-11", name: "Site K", location: "Surabaya" },
];

/** A small catalog of master items spanning the four sections. */
export const MOCK_MASTER_ITEMS: MasterItem[] = [
  {
    id: "item-01",
    itemCode: "FRZ-001",
    description: "Beef Sirloin",
    brand: "AngusPro",
    size: "1 kg",
    unit: "Kg",
    price: 185000,
    section: "Frozen",
  },
  {
    id: "item-02",
    itemCode: "FRZ-002",
    description: "Chicken Breast",
    brand: "Poultry Farm",
    size: "1 kg",
    unit: "Kg",
    price: 45000,
    section: "Frozen",
  },
  {
    id: "item-03",
    itemCode: "FRZ-003",
    description: "Dory Fillet",
    brand: "SeaFresh",
    size: "500 g",
    unit: "Pack",
    price: 38000,
    section: "Frozen",
  },
  {
    id: "item-04",
    itemCode: "DRY-001",
    description: "Fresh Milk UHT",
    brand: "DairyGold",
    size: "1 L",
    unit: "Ctn",
    price: 21000,
    section: "Dry Goods & Dairy",
  },
  {
    id: "item-05",
    itemCode: "DRY-002",
    description: "All-Purpose Flour",
    brand: "MillStone",
    size: "25 kg",
    unit: "Sack",
    price: 245000,
    section: "Dry Goods & Dairy",
  },
  {
    id: "item-06",
    itemCode: "VEG-001",
    description: "Tomato Fresh",
    brand: "Local Farm",
    size: "1 kg",
    unit: "Kg",
    price: 18000,
    section: "Fresh Vegetable & Fruits",
  },
  {
    id: "item-07",
    itemCode: "VEG-002",
    description: "Apple Fuji",
    brand: "Import",
    size: "1 kg",
    unit: "Kg",
    price: 42000,
    section: "Fresh Vegetable & Fruits",
  },
  {
    id: "item-08",
    itemCode: "CHM-001",
    description: "Dishwash Liquid",
    brand: "CleanPro",
    size: "5 L",
    unit: "Jerry",
    price: 65000,
    section: "Chemical & Consumable",
  },
  {
    id: "item-09",
    itemCode: "CHM-002",
    description: "Hand Soap Refill",
    brand: "HygienePlus",
    size: "1 L",
    unit: "Btl",
    price: 28000,
    section: "Chemical & Consumable",
  },
  {
    id: "item-10",
    itemCode: "DRY-003",
    description: "Cooking Oil",
    brand: "GoldenPalm",
    size: "18 L",
    unit: "Jerry",
    price: 315000,
    section: "Dry Goods & Dairy",
  },
];

/** Today's date as an ISO date string (YYYY-MM-DD), local time. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Deterministic pseudo-random generator so the mock table is stable per
 * (item, site, date) rather than reshuffling on every render.
 */
function seededInt(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % (max + 1);
}

/**
 * Build a mock daily stock row for an item at a site on a date. Values are
 * derived deterministically from the ids/date so re-selecting a date returns
 * the same numbers — a stand-in for what the backend will later serve.
 */
export function mockDailyStockRow(
  itemId: string,
  siteId: string,
  date: string,
): DailyStockRow {
  const seed = `${itemId}-${siteId}-${date}`;
  return {
    id: `ds-${seed}`,
    itemId,
    siteId,
    date,
    begBalance: 20 + seededInt(seed + "beg", 60),
    receiving: seededInt(seed + "rec", 30),
    regular: seededInt(seed + "reg", 15),
    snack: seededInt(seed + "sn", 6),
    backcharge: seededInt(seed + "bc", 3),
    hkl: seededInt(seed + "hkl", 3),
    event: seededInt(seed + "ev", 4),
    ent: seededInt(seed + "ent", 2),
    toQty: seededInt(seed + "to", 3),
    spoil: seededInt(seed + "sp", 2),
  };
}

/** Build the full set of daily stock rows for a site + date (mock). */
export function mockDailyStockForSite(
  siteId: string,
  date: string,
): DailyStockRow[] {
  return MOCK_MASTER_ITEMS.map((item) =>
    mockDailyStockRow(item.id, siteId, date),
  );
}
