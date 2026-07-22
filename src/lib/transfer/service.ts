import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { dailyStock, masterItems, sites, stockTransfers, users } from "@/db/schema";
import { logActivity } from "@/lib/auth/audit";
import { todayISODate } from "@/lib/date";

/** Raised on invalid transfer input (400) or a missing reference (404). */
export class TransferError extends Error {
  constructor(
    public readonly status: 400 | 404,
    message: string,
  ) {
    super(message);
    this.name = "TransferError";
  }
}

export interface CreateTransferInput {
  fromSiteId: string;
  toSiteId: string;
  itemId: string;
  quantity: number;
  note?: string;
}

/** Parse and validate a raw request body into CreateTransferInput. */
export function parseCreateTransfer(body: unknown): CreateTransferInput {
  if (typeof body !== "object" || body === null) {
    throw new TransferError(400, "Body permintaan tidak valid.");
  }
  const b = body as Record<string, unknown>;
  const fromSiteId = typeof b.fromSiteId === "string" ? b.fromSiteId.trim() : "";
  const toSiteId = typeof b.toSiteId === "string" ? b.toSiteId.trim() : "";
  const itemId = typeof b.itemId === "string" ? b.itemId.trim() : "";
  const quantity =
    typeof b.quantity === "number" ? b.quantity : Number(b.quantity);

  if (!fromSiteId) throw new TransferError(400, "Site asal wajib dipilih.");
  if (!toSiteId) throw new TransferError(400, "Site tujuan wajib dipilih.");
  if (fromSiteId === toSiteId) {
    throw new TransferError(400, "Site tujuan harus berbeda dari asal.");
  }
  if (!itemId) throw new TransferError(400, "Item wajib dipilih.");
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
    throw new TransferError(400, "Jumlah harus bilangan bulat lebih dari 0.");
  }

  return {
    fromSiteId,
    toSiteId,
    itemId,
    quantity,
    note: typeof b.note === "string" ? b.note.trim() : undefined,
  };
}

/** The latest stored Balance for an item at a site (0 if no history). */
export async function getLatestBalance(
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
  if (!row) throw new TransferError(404, `${label} tidak ditemukan.`);
}

/**
 * Create an inter-site transfer. Validates that both sites and the item exist
 * and that the origin has enough stock, then records the transfer (pending) and
 * logs it automatically. Stock is synchronized on approval (separate step).
 */
export async function createTransfer(
  input: CreateTransferInput,
  actorUserId: string | null = null,
) {
  await assertExists(sites, input.fromSiteId, "Site asal");
  await assertExists(sites, input.toSiteId, "Site tujuan");
  await assertExists(masterItems, input.itemId, "Item");

  const available = await getLatestBalance(input.fromSiteId, input.itemId);
  if (input.quantity > available) {
    throw new TransferError(
      400,
      `Stok tidak cukup. Tersedia ${available} unit di site asal.`,
    );
  }

  const [created] = await db
    .insert(stockTransfers)
    .values({
      transferDate: todayISODate(),
      itemId: input.itemId,
      fromSiteId: input.fromSiteId,
      toSiteId: input.toSiteId,
      quantity: input.quantity,
      status: "pending",
      note: input.note,
      requestedBy: actorUserId,
    })
    .returning();

  await logActivity({
    userId: actorUserId,
    action: "create_transfer",
    resourceTarget: `transfer:${created.id}`,
    detail: `Transfer ${input.quantity} unit antar site (menunggu persetujuan).`,
  });

  return created;
}

export interface ListTransfersFilters {
  /** Filter by status, or "all"/undefined. */
  status?: string;
  /** Match against either the origin or destination site id, or "all". */
  siteId?: string;
  /** Keyword over item code / description. */
  q?: string;
  limit?: number;
}

export interface TransferDTO {
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

/**
 * List transfer history (newest first) joined with item, both sites, and the
 * reviewer, filtered by status, involved site, and keyword.
 */
export async function listTransfers(
  filters: ListTransfersFilters = {},
): Promise<TransferDTO[]> {
  const fromSites = alias(sites, "from_sites");
  const toSites = alias(sites, "to_sites");
  const checker = alias(users, "checker");

  const conditions: SQL[] = [];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(stockTransfers.status, filters.status as never));
  }
  if (filters.siteId && filters.siteId !== "all") {
    const bySite = or(
      eq(stockTransfers.fromSiteId, filters.siteId),
      eq(stockTransfers.toSiteId, filters.siteId),
    );
    if (bySite) conditions.push(bySite);
  }
  if (filters.q && filters.q.trim()) {
    const like = `%${filters.q.trim()}%`;
    const match = or(
      ilike(masterItems.itemCode, like),
      ilike(masterItems.description, like),
    );
    if (match) conditions.push(match);
  }

  const rows = await db
    .select({
      id: stockTransfers.id,
      date: stockTransfers.transferDate,
      quantity: stockTransfers.quantity,
      status: stockTransfers.status,
      itemCode: masterItems.itemCode,
      itemDescription: masterItems.description,
      fromSite: fromSites.name,
      toSite: toSites.name,
      checkedBy: checker.name,
    })
    .from(stockTransfers)
    .innerJoin(masterItems, eq(stockTransfers.itemId, masterItems.id))
    .innerJoin(fromSites, eq(stockTransfers.fromSiteId, fromSites.id))
    .innerJoin(toSites, eq(stockTransfers.toSiteId, toSites.id))
    .leftJoin(checker, eq(stockTransfers.checkedBy, checker.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stockTransfers.transferDate), desc(stockTransfers.createdAt))
    .limit(Math.min(filters.limit ?? 200, 500));

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    itemCode: r.itemCode,
    itemDescription: r.itemDescription,
    fromSite: r.fromSite,
    toSite: r.toSite,
    quantity: r.quantity,
    status: r.status,
    checkedBy: r.checkedBy ?? "—",
  }));
}
