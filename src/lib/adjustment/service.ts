import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyStock,
  masterItems,
  sites,
  stockAdjustments,
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
