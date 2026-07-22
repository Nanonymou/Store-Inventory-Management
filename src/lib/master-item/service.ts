import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { itemSections, masterItems } from "@/db/schema";

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
