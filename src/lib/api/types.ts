import type {
  DailyStockMovements,
  DailyStockRow,
  MasterItem,
} from "@/lib/types";
import { MOVEMENT_COLUMNS } from "@/lib/types";

/** Item as returned by /api/master-items (section is the section name). */
export interface ApiMasterItem {
  id: string;
  itemCode: string;
  description: string;
  brand: string | null;
  size: string | null;
  unit: string | null;
  price: number;
  section: string;
  sectionId: string;
  isActive: boolean;
}

/** Convert an API item into the UI's MasterItem shape. */
export function toMasterItem(i: ApiMasterItem): MasterItem {
  return {
    id: i.id,
    itemCode: i.itemCode,
    description: i.description,
    brand: i.brand ?? "",
    size: i.size ?? "",
    unit: i.unit ?? "",
    price: i.price,
    // The catalog only defines the four canonical sections; cast is safe.
    section: i.section as MasterItem["section"],
  };
}

/** A composed stock row returned by /api/transactions and /api/dashboard/stock. */
export interface ApiStockViewRow extends DailyStockMovements {
  itemId: string;
  itemCode: string;
  description: string;
  brand: string | null;
  size: string | null;
  unit: string | null;
  price: number;
  section: string;
  balance: number;
  persisted: boolean;
}

/**
 * Split composed stock view rows into the (items, rows) pair the table
 * components consume. Movement values come straight from the API row; ids for
 * the daily-stock row are synthesised from the site + date + item.
 */
export function splitStockView(
  viewRows: ApiStockViewRow[],
  siteId: string,
  date: string,
): { items: MasterItem[]; rows: DailyStockRow[] } {
  const items: MasterItem[] = [];
  const rows: DailyStockRow[] = [];

  for (const v of viewRows) {
    items.push({
      id: v.itemId,
      itemCode: v.itemCode,
      description: v.description,
      brand: v.brand ?? "",
      size: v.size ?? "",
      unit: v.unit ?? "",
      price: v.price,
      section: v.section as MasterItem["section"],
    });

    const movements = {} as DailyStockMovements;
    for (const col of MOVEMENT_COLUMNS) movements[col.key] = v[col.key];

    rows.push({
      id: `${siteId}:${date}:${v.itemId}`,
      itemId: v.itemId,
      siteId,
      date,
      ...movements,
    });
  }

  return { items, rows };
}

export interface ApiSite {
  id: string;
  name: string;
  location: string;
}

export interface ApiSection {
  id: string;
  name: string;
}

/** Transfer history row from /api/transfers. */
export interface ApiTransfer {
  id: string;
  date: string;
  itemCode: string;
  itemDescription: string;
  fromSite: string;
  toSite: string;
  quantity: number;
  status: string;
  checkedBy: string;
}

/** Adjustment history row from /api/adjustments. */
export interface ApiAdjustment {
  id: string;
  date: string;
  site: string;
  itemCode: string;
  itemDescription: string;
  before: number;
  after: number;
  reason: string;
  note: string;
  adjustedBy: string;
}
