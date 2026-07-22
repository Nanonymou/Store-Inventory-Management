import type { SessionUser } from "@/lib/types";
import { getSession } from "./session";
import { guardWithAudit } from "./audit";
import { requireAdmin, requireUser } from "./rbac";

/**
 * Resolve the current session and require an authenticated user, auditing the
 * denial if there is none. Returns the user.
 */
export async function requireUserApi(
  resourceTarget: string,
): Promise<SessionUser> {
  const session = await getSession();
  return guardWithAudit(() => requireUser(session), {
    user: session,
    resourceTarget,
  });
}

/**
 * Resolve the current session and require an Admin, auditing the denial (401 for
 * no session, 403 for a non-Admin). Returns the Admin user. This is the single
 * gate Admin-only API routes (audit log, user management, …) go through.
 */
export async function requireAdminApi(
  resourceTarget: string,
): Promise<SessionUser> {
  const session = await getSession();
  return guardWithAudit(() => requireAdmin(session), {
    user: session,
    resourceTarget,
  });
}
