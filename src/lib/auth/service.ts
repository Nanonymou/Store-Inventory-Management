import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { SessionUser } from "@/lib/types";
import { verifyPassword } from "./password";

export interface AuthResult {
  user: SessionUser;
  /** Whether the user must change a temporary password on this login. */
  mustChangePassword: boolean;
}

/**
 * Authenticate an email + password against the users table. Returns the session
 * user on success or null on any failure (unknown email or wrong password —
 * indistinguishable to the caller to avoid user enumeration).
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<AuthResult | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await db
    .select()
    .from(users)
    // Case-insensitive email match.
    .where(eq(sql`lower(${users.email})`, normalized))
    .limit(1);

  if (!row) return null;
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return null;

  return {
    user: {
      id: row.id,
      name: row.name,
      role: row.role,
      siteId: row.role === "admin" ? null : row.siteId,
    },
    mustChangePassword: row.mustChangePassword === 1,
  };
}
