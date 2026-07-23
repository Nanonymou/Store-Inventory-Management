import { and, asc, count, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyStock,
  sites,
  stockAdjustments,
  stockTransfers,
  users,
} from "@/db/schema";
import { logActivity } from "@/lib/auth/audit";

/** Raised on invalid site input (400), missing site (404), or a conflict (409). */
export class SiteError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "SiteError";
  }
}

/** Validated, normalized fields for creating/updating a site. */
export interface SiteInput {
  name: string;
  location: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Parse and validate a raw request body into SiteInput. */
export function parseSiteInput(body: unknown): SiteInput {
  if (typeof body !== "object" || body === null) {
    throw new SiteError(400, "Body permintaan tidak valid.");
  }
  const b = body as Record<string, unknown>;

  const name = str(b.name);
  if (!name) throw new SiteError(400, "Nama lokasi wajib diisi.");
  if (name.length > 120) {
    throw new SiteError(400, "Nama lokasi maksimal 120 karakter.");
  }

  const location = str(b.location);
  if (!location) throw new SiteError(400, "Alamat/kota lokasi wajib diisi.");
  if (location.length > 200) {
    throw new SiteError(400, "Alamat/kota maksimal 200 karakter.");
  }

  return { name, location };
}

/** Throw 409 if a site name already exists (case-insensitive), excluding `exceptId`. */
async function assertNameUnique(
  name: string,
  exceptId?: string,
): Promise<void> {
  const clash = and(
    ilike(sites.name, name),
    exceptId ? sql`${sites.id} <> ${exceptId}` : undefined,
  );
  const [row] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(clash)
    .limit(1);
  if (row) {
    throw new SiteError(409, `Nama lokasi "${name}" sudah dipakai.`);
  }
}

export interface SiteDTO {
  id: string;
  name: string;
  location: string;
}

/** Create a new site. Enforces a unique name and records an audit entry. */
export async function createSite(
  input: SiteInput,
  actorUserId: string | null = null,
): Promise<SiteDTO> {
  await assertNameUnique(input.name);

  const [created] = await db
    .insert(sites)
    .values({ name: input.name, location: input.location })
    .returning({ id: sites.id });

  await logActivity({
    userId: actorUserId,
    action: "create_site",
    resourceTarget: `site:${input.name}`,
    detail: `Menambah lokasi "${input.name}" (${input.location}).`,
  });

  return { id: created.id, name: input.name, location: input.location };
}

/** Update an existing site. Enforces name uniqueness and audits the change. */
export async function updateSite(
  id: string,
  input: SiteInput,
  actorUserId: string | null = null,
): Promise<SiteDTO> {
  const [existing] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  if (!existing) throw new SiteError(404, "Lokasi tidak ditemukan.");

  await assertNameUnique(input.name, id);

  await db
    .update(sites)
    .set({ name: input.name, location: input.location })
    .where(eq(sites.id, id));

  await logActivity({
    userId: actorUserId,
    action: "update_site",
    resourceTarget: `site:${input.name}`,
    detail: `Mengubah lokasi menjadi "${input.name}" (${input.location}).`,
  });

  return { id, name: input.name, location: input.location };
}

/**
 * Delete a site. Refused (409) when the site still has users assigned or any
 * stock history (daily stock, transfers, adjustments), so historical data is
 * never silently cascaded away. Records an audit entry on success.
 */
export async function deleteSite(
  id: string,
  actorUserId: string | null = null,
): Promise<{ name: string }> {
  const [existing] = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  if (!existing) throw new SiteError(404, "Lokasi tidak ditemukan.");

  const [[{ userRefs }], [{ stockRefs }], [{ fromRefs }], [{ toRefs }], [{ adjRefs }]] =
    await Promise.all([
      db.select({ userRefs: count() }).from(users).where(eq(users.siteId, id)),
      db
        .select({ stockRefs: count() })
        .from(dailyStock)
        .where(eq(dailyStock.siteId, id)),
      db
        .select({ fromRefs: count() })
        .from(stockTransfers)
        .where(eq(stockTransfers.fromSiteId, id)),
      db
        .select({ toRefs: count() })
        .from(stockTransfers)
        .where(eq(stockTransfers.toSiteId, id)),
      db
        .select({ adjRefs: count() })
        .from(stockAdjustments)
        .where(eq(stockAdjustments.siteId, id)),
    ]);

  if (userRefs > 0) {
    throw new SiteError(
      409,
      "Lokasi masih memiliki pengguna terikat. Pindahkan pengguna terlebih dahulu.",
    );
  }
  if (stockRefs > 0 || fromRefs > 0 || toRefs > 0 || adjRefs > 0) {
    throw new SiteError(
      409,
      "Lokasi memiliki riwayat stok/mutasi dan tidak dapat dihapus.",
    );
  }

  await db.delete(sites).where(eq(sites.id, id));

  await logActivity({
    userId: actorUserId,
    action: "delete_site",
    resourceTarget: `site:${existing.name}`,
    detail: `Menghapus lokasi "${existing.name}".`,
  });

  return { name: existing.name };
}

/**
 * List all sites with the number of users assigned to each — the Admin
 * management view. Ordered by name.
 */
export async function listSitesWithStats() {
  return db
    .select({
      id: sites.id,
      name: sites.name,
      location: sites.location,
      userCount: count(users.id),
    })
    .from(sites)
    .leftJoin(users, eq(users.siteId, sites.id))
    .groupBy(sites.id)
    .orderBy(asc(sites.name));
}
