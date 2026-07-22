import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { itemSections, sites } from "@/db/schema";
import type { SessionUser } from "@/lib/types";

/**
 * List the sites a user may see. An Admin sees all 11 locations (for the site
 * switcher); a Storeman sees only their own bound site.
 */
export async function listSitesForUser(user: SessionUser) {
  const columns = {
    id: sites.id,
    name: sites.name,
    location: sites.location,
  };

  if (user.role === "storeman") {
    if (!user.siteId) return [];
    return db
      .select(columns)
      .from(sites)
      .where(eq(sites.id, user.siteId))
      .orderBy(asc(sites.name));
  }

  return db.select(columns).from(sites).orderBy(asc(sites.name));
}

/** List all item sections (shared reference data for filters). */
export async function listSections() {
  return db
    .select({ id: itemSections.id, name: itemSections.name })
    .from(itemSections)
    .orderBy(asc(itemSections.name));
}
