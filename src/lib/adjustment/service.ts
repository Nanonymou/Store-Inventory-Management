import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyStock,
  masterItems,
  sites,
  stockAdjustments,
  users,
} from "@/db/schema";
import { logActivity } from "@/lib/auth/audit";
import { todayISODate } from "@/lib/date";

/** Raised on invalid adjustment input (400) or a missing reference (404). */
export class AdjustmentError extends Error {
  constructor(
    public readonly status: 400 | 404,
    message: string,
  ) {
    super(message);
    this.name = "AdjustmentError";
  }
}

export interface CreateAdjustmentInput {
  siteId: string;
  itemId: string;
  /** The counted physical quantity (the new balance). */
  physicalCount: number;
  reason: string;
  note?: string;
}

export function parseCreateAdjustment(body: unknown): CreateAdjustmentInput {
  if (typeof body !== "object" || body === null) {
    throw new AdjustmentError(400, "Body permintaan tidak valid.");
  }
  const b = body as Record<string, unknown>;
  const siteId = typeof b.siteId === "string" ? b.siteId.trim() : "";
  const itemId = typeof b.itemId === "string" ? b.itemId.trim() : "";
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  const physicalCount =
    typeof b.physicalCount === "number"
      ? b.physicalCount
      : Number(b.physicalCount);

  if (!siteId) throw new AdjustmentError(400, "Site wajib dipilih.");
  if (!itemId) throw new AdjustmentError(400, "Item wajib dipilih.");
  if (!reason) throw new AdjustmentError(400, "Alasan wajib diisi.");
  if (
    !Number.isFinite(physicalCount) ||
    !Number.isInteger(physicalCount) ||
    physicalCount < 0
  ) {
    throw new AdjustmentError(400, "Jumlah fisik harus bilangan bulat ≥ 0.");
  }

  return {
    siteId,
    itemId,
    physicalCount,
    reason,
    note: typeof b.note === "string" ? b.note.trim() : undefined,
  };
}

/** The latest stored Balance for an item at a site (0 if no history). */
async function getLatestBalance(
  siteId: string,
  itemId: string,
): Promise<number> {
  const [row] = await db
    .select({ balance: dailyStock.balance })
    .from(dailyStock)
    .where(and(eq(dailyStock.siteId, siteId), eq(dailyStock.itemId, itemId)))
    .orderBy(desc(dailyStock.recordDate))
    .limit(1);
  return row?.balance ?? 0;
}

async function assertExists(
  table: typeof sites | typeof masterItems,
  id: string,
  label: string,
) {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.id, id))
    .limit(1);
  if (!row) throw new AdjustmentError(404, `${label} tidak ditemukan.`);
}

/**
 * Record a stock adjustment (opname) and apply the new balance immediately.
 *
 * The current balance (before) is read, the adjustment is recorded, and today's
 * daily_stock balance for the item at the site is set to the counted value
 * (after) — a direct saldo update that does not alter the day's normal movement
 * columns. Auto-logs the change.
 */
export async function createAdjustment(
  input: CreateAdjustmentInput,
  actorUserId: string | null = null,
) {
  await assertExists(sites, input.siteId, "Site");
  await assertExists(masterItems, input.itemId, "Item");

  const before = await getLatestBalance(input.siteId, input.itemId);
  const after = input.physicalCount;
  if (before === after) {
    throw new AdjustmentError(400, "Tidak ada selisih untuk disesuaikan.");
  }

  const [adjustment] = await db
    .insert(stockAdjustments)
    .values({
      adjustmentDate: todayISODate(),
      siteId: input.siteId,
      itemId: input.itemId,
      beforeQty: before,
      afterQty: after,
      reason: input.reason,
      note: input.note,
      adjustedBy: actorUserId,
    })
    .returning();

  // Apply the new balance directly to today's stock row (create if absent).
  const now = new Date();
  await db
    .insert(dailyStock)
    .values({
      recordDate: todayISODate(),
      itemId: input.itemId,
      siteId: input.siteId,
      begBalance: before,
      balance: after,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [dailyStock.recordDate, dailyStock.itemId, dailyStock.siteId],
      set: { balance: after, updatedBy: actorUserId, updatedAt: now },
    });

  await logActivity({
    userId: actorUserId,
    action: "adjust_stock",
    resourceTarget: `stock_adjustment:${adjustment.id}`,
    detail: `Penyesuaian (${input.reason}): ${before} → ${after}.`,
  });

  return { adjustment, before, after };
}

export interface ListAdjustmentsFilters {
  siteId?: string;
  reason?: string;
  q?: string;
  sort?: "date" | "difference";
  dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface AdjustmentDTO {
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

function adjustmentConditions(filters: ListAdjustmentsFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.siteId && filters.siteId !== "all") {
    conditions.push(eq(stockAdjustments.siteId, filters.siteId));
  }
  if (filters.reason && filters.reason !== "all") {
    conditions.push(eq(stockAdjustments.reason, filters.reason));
  }
  if (filters.q && filters.q.trim()) {
    const like = `%${filters.q.trim()}%`;
    const match = or(
      ilike(masterItems.itemCode, like),
      ilike(masterItems.description, like),
    );
    if (match) conditions.push(match);
  }
  return conditions;
}

/**
 * List adjustment history joined with site, item, and adjuster, with filters,
 * sorting (by date or signed difference), and pagination.
 */
export async function listAdjustments(
  filters: ListAdjustmentsFilters = {},
): Promise<AdjustmentDTO[]> {
  const conditions = adjustmentConditions(filters);
  const diffExpr = sql<number>`(${stockAdjustments.afterQty} - ${stockAdjustments.beforeQty})`;
  const dir = filters.dir ?? "desc";
  const orderCol =
    filters.sort === "difference" ? diffExpr : stockAdjustments.adjustmentDate;
  const orderBy = dir === "asc" ? asc(orderCol) : desc(orderCol);

  const rows = await db
    .select({
      id: stockAdjustments.id,
      date: stockAdjustments.adjustmentDate,
      before: stockAdjustments.beforeQty,
      after: stockAdjustments.afterQty,
      reason: stockAdjustments.reason,
      note: stockAdjustments.note,
      site: sites.name,
      itemCode: masterItems.itemCode,
      itemDescription: masterItems.description,
      adjustedBy: users.name,
    })
    .from(stockAdjustments)
    .innerJoin(sites, eq(stockAdjustments.siteId, sites.id))
    .innerJoin(masterItems, eq(stockAdjustments.itemId, masterItems.id))
    .leftJoin(users, eq(stockAdjustments.adjustedBy, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(Math.min(filters.limit ?? 100, 500))
    .offset(filters.offset ?? 0);

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    site: r.site,
    itemCode: r.itemCode,
    itemDescription: r.itemDescription,
    before: r.before,
    after: r.after,
    reason: r.reason,
    note: r.note ?? "",
    adjustedBy: r.adjustedBy ?? "—",
  }));
}

/** Total adjustments matching the filters (for pagination). */
export async function countAdjustments(
  filters: ListAdjustmentsFilters = {},
): Promise<number> {
  const conditions = adjustmentConditions(filters);
  const [row] = await db
    .select({ total: count() })
    .from(stockAdjustments)
    .innerJoin(masterItems, eq(stockAdjustments.itemId, masterItems.id))
    .where(conditions.length ? and(...conditions) : undefined);
  return row?.total ?? 0;
}
