import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyStock, itemSections, masterItems } from "@/db/schema";
import {
  MOVEMENT_COLUMNS,
  computeBalance,
  type DailyStockMovements,
} from "@/lib/types";
import { isValidISODate, previousISODate } from "@/lib/date";

/** Raised on invalid input; carries a 400 status for the route to surface. */
export class ValidationError extends Error {
  status = 400 as const;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** One validated entry: an item plus all its movement quantities. */
export interface DailyStockEntry extends DailyStockMovements {
  itemId: string;
}

export interface SaveDailyStockPayload {
  siteId: string;
  date: string;
  entries: DailyStockEntry[];
}

const MOVEMENT_KEYS = MOVEMENT_COLUMNS.map((c) => c.key);

function asMovementQty(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new ValidationError(`Kolom "${field}" harus berupa bilangan bulat.`);
  }
  if (n < 0) {
    throw new ValidationError(`Kolom "${field}" tidak boleh negatif.`);
  }
  if (n > 1_000_000_000) {
    throw new ValidationError(`Kolom "${field}" melebihi batas wajar.`);
  }
  return n;
}

/**
 * Validate a raw request body into a typed SaveDailyStockPayload. Throws
 * ValidationError on any malformed field.
 */
export function parseSaveDailyStockPayload(
  body: unknown,
): SaveDailyStockPayload {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Body permintaan tidak valid.");
  }
  const b = body as Record<string, unknown>;

  const siteId = typeof b.siteId === "string" ? b.siteId.trim() : "";
  if (!siteId) throw new ValidationError("siteId wajib diisi.");

  const date = typeof b.date === "string" ? b.date.trim() : "";
  if (!isValidISODate(date)) {
    throw new ValidationError("Tanggal harus dalam format YYYY-MM-DD.");
  }

  if (!Array.isArray(b.entries) || b.entries.length === 0) {
    throw new ValidationError("Minimal satu entri transaksi diperlukan.");
  }

  const seenItems = new Set<string>();
  const entries: DailyStockEntry[] = b.entries.map((raw) => {
    if (typeof raw !== "object" || raw === null) {
      throw new ValidationError("Setiap entri harus berupa objek.");
    }
    const r = raw as Record<string, unknown>;
    const itemId = typeof r.itemId === "string" ? r.itemId.trim() : "";
    if (!itemId) throw new ValidationError("Setiap entri butuh itemId.");
    if (seenItems.has(itemId)) {
      throw new ValidationError(`Entri ganda untuk item ${itemId}.`);
    }
    seenItems.add(itemId);

    const movements = {} as DailyStockMovements;
    for (const key of MOVEMENT_KEYS) {
      movements[key] = asMovementQty(r[key], key);
    }
    return { itemId, ...movements };
  });

  return { siteId, date, entries };
}

/**
 * Persist a batch of daily-stock entries for a site + date. Balance is computed
 * server-side (never trusted from the client) and rows are upserted on the
 * unique (record_date, item_id, site_id) key so re-saving a day overwrites it.
 * Returns the number of rows written.
 *
 * Authorization (site scope + date lock) must be enforced by the caller before
 * invoking this.
 */
export async function saveDailyStock(
  payload: SaveDailyStockPayload,
  actorUserId: string | null,
): Promise<{ saved: number }> {
  const { siteId, date, entries } = payload;

  // Guard against unknown/ inactive items to keep referential integrity clear.
  const itemIds = entries.map((e) => e.itemId);
  const known = await db
    .select({ id: masterItems.id })
    .from(masterItems)
    .where(inArray(masterItems.id, itemIds));
  const knownIds = new Set(known.map((k) => k.id));
  const unknown = itemIds.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new ValidationError(
      `Item tidak dikenal: ${unknown.slice(0, 3).join(", ")}`,
    );
  }

  const now = new Date();
  const values = entries.map((e) => ({
    recordDate: date,
    itemId: e.itemId,
    siteId,
    begBalance: e.begBalance,
    receiving: e.receiving,
    regular: e.regular,
    snack: e.snack,
    backcharge: e.backcharge,
    hkl: e.hkl,
    event: e.event,
    ent: e.ent,
    toQty: e.toQty,
    spoil: e.spoil,
    balance: computeBalance(e),
    createdBy: actorUserId,
    updatedBy: actorUserId,
    updatedAt: now,
  }));

  await db
    .insert(dailyStock)
    .values(values)
    .onConflictDoUpdate({
      target: [dailyStock.recordDate, dailyStock.itemId, dailyStock.siteId],
      set: {
        begBalance: sqlExcluded("beg_balance"),
        receiving: sqlExcluded("receiving"),
        regular: sqlExcluded("regular"),
        snack: sqlExcluded("snack"),
        backcharge: sqlExcluded("backcharge"),
        hkl: sqlExcluded("hkl"),
        event: sqlExcluded("event"),
        ent: sqlExcluded("ent"),
        toQty: sqlExcluded("to_qty"),
        spoil: sqlExcluded("spoil"),
        balance: sqlExcluded("balance"),
        updatedBy: actorUserId,
        updatedAt: now,
      },
    });

  return { saved: values.length };
}

/** Reference the conflicting row's incoming value (`excluded.<col>`). */
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}

/** Read the previously stored daily rows for a site + date. */
export async function getDailyStock(siteId: string, date: string) {
  return db
    .select()
    .from(dailyStock)
    .where(and(eq(dailyStock.siteId, siteId), eq(dailyStock.recordDate, date)));
}

/** A composed row for the daily transaction view: item + movements + balance. */
export interface DailyStockViewRow extends DailyStockMovements {
  itemId: string;
  itemCode: string;
  description: string;
  brand: string | null;
  size: string | null;
  unit: string | null;
  price: number;
  section: string;
  balance: number;
  /** True when the row was actually saved for this date (vs. a fresh default). */
  persisted: boolean;
}

const ZERO_MOVEMENTS: Omit<DailyStockMovements, "begBalance"> = {
  receiving: 0,
  regular: 0,
  snack: 0,
  backcharge: 0,
  hkl: 0,
  event: 0,
  ent: 0,
  toQty: 0,
  spoil: 0,
};

/**
 * Build the full daily transaction view for a site + date: every active master
 * item paired with its stored movements, or — when nothing was saved yet — a
 * blank row whose Beginning Balance auto-carries from the previous day's
 * Balance (falling back to 0 when there is no history).
 */
export async function getDailyStockView(
  siteId: string,
  date: string,
): Promise<DailyStockViewRow[]> {
  const items = await db
    .select({
      id: masterItems.id,
      itemCode: masterItems.itemCode,
      description: masterItems.description,
      brand: masterItems.brand,
      size: masterItems.size,
      unit: masterItems.unit,
      price: masterItems.price,
      section: itemSections.name,
    })
    .from(masterItems)
    .innerJoin(itemSections, eq(masterItems.sectionId, itemSections.id))
    .where(eq(masterItems.isActive, 1))
    .orderBy(asc(masterItems.itemCode));

  const [current, previous] = await Promise.all([
    getDailyStock(siteId, date),
    getDailyStock(siteId, previousISODate(date)),
  ]);

  const currentByItem = new Map(current.map((r) => [r.itemId, r]));
  const prevBalanceByItem = new Map(previous.map((r) => [r.itemId, r.balance]));

  return items.map((item) => {
    const stored = currentByItem.get(item.id);
    if (stored) {
      return {
        itemId: item.id,
        itemCode: item.itemCode,
        description: item.description,
        brand: item.brand,
        size: item.size,
        unit: item.unit,
        price: item.price,
        section: item.section,
        begBalance: stored.begBalance,
        receiving: stored.receiving,
        regular: stored.regular,
        snack: stored.snack,
        backcharge: stored.backcharge,
        hkl: stored.hkl,
        event: stored.event,
        ent: stored.ent,
        toQty: stored.toQty,
        spoil: stored.spoil,
        balance: stored.balance,
        persisted: true,
      };
    }

    const begBalance = prevBalanceByItem.get(item.id) ?? 0;
    const movements: DailyStockMovements = { begBalance, ...ZERO_MOVEMENTS };
    return {
      itemId: item.id,
      itemCode: item.itemCode,
      description: item.description,
      brand: item.brand,
      size: item.size,
      unit: item.unit,
      price: item.price,
      section: item.section,
      ...movements,
      balance: computeBalance(movements),
      persisted: false,
    };
  });
}
