import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { itemSections, masterItems } from "@/db/schema";
import { ITEM_SECTIONS } from "@/lib/types";

/** Raised on invalid item input (400) or a duplicate item code (409). */
export class MasterItemError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "MasterItemError";
  }
}

/** Validated, normalized fields for creating/updating a master item. */
export interface MasterItemInput {
  itemCode: string;
  description: string;
  brand: string | null;
  size: string | null;
  unit: string | null;
  price: number;
  section: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStr(value: unknown): string | null {
  const s = str(value);
  return s === "" ? null : s;
}

/** Parse and validate a raw request body into MasterItemInput. */
export function parseMasterItemInput(body: unknown): MasterItemInput {
  if (typeof body !== "object" || body === null) {
    throw new MasterItemError(400, "Body permintaan tidak valid.");
  }
  const b = body as Record<string, unknown>;

  const itemCode = str(b.itemCode);
  if (!itemCode) throw new MasterItemError(400, "Item Code wajib diisi.");

  const description = str(b.description);
  if (!description) throw new MasterItemError(400, "Description wajib diisi.");

  const priceNum = typeof b.price === "number" ? b.price : Number(b.price);
  if (!Number.isFinite(priceNum) || Number.isNaN(priceNum)) {
    throw new MasterItemError(400, "Price harus berupa angka.");
  }
  if (priceNum < 0) throw new MasterItemError(400, "Price tidak boleh negatif.");

  const section = str(b.section);
  if (!(ITEM_SECTIONS as readonly string[]).includes(section)) {
    throw new MasterItemError(400, "Section tidak valid.");
  }

  return {
    itemCode,
    description,
    brand: optionalStr(b.brand),
    size: optionalStr(b.size),
    unit: optionalStr(b.unit),
    price: priceNum,
    section,
  };
}

/** Resolve a section name to its id, or 404 if unknown. */
async function resolveSectionId(section: string): Promise<string> {
  const [row] = await db
    .select({ id: itemSections.id })
    .from(itemSections)
    .where(eq(itemSections.name, section))
    .limit(1);
  if (!row) {
    throw new MasterItemError(404, `Section "${section}" belum terdaftar.`);
  }
  return row.id;
}

/** Throw 409 if an item code already exists (case-insensitive), excluding `exceptId`. */
async function assertItemCodeUnique(
  itemCode: string,
  exceptId?: string,
): Promise<void> {
  const clash = and(
    ilike(masterItems.itemCode, itemCode),
    exceptId ? sql`${masterItems.id} <> ${exceptId}` : undefined,
  );
  const [row] = await db
    .select({ id: masterItems.id })
    .from(masterItems)
    .where(clash)
    .limit(1);
  if (row) {
    throw new MasterItemError(409, `Item Code "${itemCode}" sudah dipakai.`);
  }
}

/**
 * Create a new master item. Validates uniqueness of the item code and resolves
 * the section, then inserts and returns the created row as a DTO.
 */
export async function createMasterItem(
  input: MasterItemInput,
): Promise<MasterItemDTO> {
  const sectionId = await resolveSectionId(input.section);
  await assertItemCodeUnique(input.itemCode);

  const [created] = await db
    .insert(masterItems)
    .values({
      itemCode: input.itemCode,
      description: input.description,
      brand: input.brand,
      size: input.size,
      unit: input.unit,
      price: input.price,
      sectionId,
    })
    .returning({ id: masterItems.id });

  return {
    id: created.id,
    itemCode: input.itemCode,
    description: input.description,
    brand: input.brand,
    size: input.size,
    unit: input.unit,
    price: input.price,
    section: input.section,
    sectionId,
    isActive: true,
  };
}

/**
 * Update an existing master item. Validates the new item code's uniqueness
 * (excluding the item itself) and resolves the section, then updates and returns
 * the row. Throws 404 if the item does not exist.
 */
export async function updateMasterItem(
  id: string,
  input: MasterItemInput,
): Promise<MasterItemDTO> {
  const [existing] = await db
    .select({ id: masterItems.id, isActive: masterItems.isActive })
    .from(masterItems)
    .where(eq(masterItems.id, id))
    .limit(1);
  if (!existing) {
    throw new MasterItemError(404, "Item tidak ditemukan.");
  }

  const sectionId = await resolveSectionId(input.section);
  await assertItemCodeUnique(input.itemCode, id);

  await db
    .update(masterItems)
    .set({
      itemCode: input.itemCode,
      description: input.description,
      brand: input.brand,
      size: input.size,
      unit: input.unit,
      price: input.price,
      sectionId,
      updatedAt: new Date(),
    })
    .where(eq(masterItems.id, id));

  return {
    id,
    itemCode: input.itemCode,
    description: input.description,
    brand: input.brand,
    size: input.size,
    unit: input.unit,
    price: input.price,
    section: input.section,
    sectionId,
    isActive: existing.isActive === 1,
  };
}

export interface ListItemsFilters {
  /** Section name to filter by, or "all"/undefined for no filter. */
  section?: string;
  /** Keyword matched against item code / description / brand. */
  query?: string;
  /** When true (default) only active items are returned. */
  activeOnly?: boolean;
}

export interface MasterItemDTO {
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

/**
 * List master items joined with their section, filtered by section and keyword.
 * Ordered by item code for a stable catalog view.
 */
export async function listMasterItems(
  filters: ListItemsFilters = {},
): Promise<MasterItemDTO[]> {
  const { section, query, activeOnly = true } = filters;
  const conditions: SQL[] = [];

  if (activeOnly) conditions.push(eq(masterItems.isActive, 1));
  if (section && section !== "all") {
    conditions.push(eq(itemSections.name, section));
  }
  if (query && query.trim()) {
    const like = `%${query.trim()}%`;
    const match = or(
      ilike(masterItems.itemCode, like),
      ilike(masterItems.description, like),
      ilike(masterItems.brand, like),
    );
    if (match) conditions.push(match);
  }

  const rows = await db
    .select({
      id: masterItems.id,
      itemCode: masterItems.itemCode,
      description: masterItems.description,
      brand: masterItems.brand,
      size: masterItems.size,
      unit: masterItems.unit,
      price: masterItems.price,
      section: itemSections.name,
      sectionId: masterItems.sectionId,
      isActive: masterItems.isActive,
    })
    .from(masterItems)
    .innerJoin(itemSections, eq(masterItems.sectionId, itemSections.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(masterItems.itemCode));

  return rows.map((r) => ({ ...r, isActive: r.isActive === 1 }));
}
