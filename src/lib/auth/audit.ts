import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionUser } from "@/lib/types";
import { AuthorizationError } from "./rbac";

/**
 * Append an entry to the audit trail. Best-effort: logging must never break the
 * primary request, so failures are swallowed with a console warning.
 */
export async function logActivity(params: {
  userId: string | null;
  action: string;
  resourceTarget: string;
  detail?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      resourceTarget: params.resourceTarget,
      detail: params.detail,
    });
  } catch (err) {
    console.warn("[audit] failed to write audit log:", err);
  }
}

/** Record an access denial (403/401) for security investigation. */
export async function logAuthDenial(params: {
  user: SessionUser | null;
  resourceTarget: string;
  reason: string;
}): Promise<void> {
  await logActivity({
    userId: params.user?.id ?? null,
    action: "access_denied",
    resourceTarget: params.resourceTarget,
    detail: params.reason,
  });
}

/**
 * Run one of the server-side guards from `rbac`, and on an AuthorizationError
 * write an audit entry before rethrowing. Wraps guards so every denial in a
 * data action is recorded consistently.
 */
export async function guardWithAudit<T>(
  guard: () => T,
  context: { user: SessionUser | null; resourceTarget: string },
): Promise<T> {
  try {
    return guard();
  } catch (err) {
    if (err instanceof AuthorizationError) {
      await logAuthDenial({
        user: context.user,
        resourceTarget: context.resourceTarget,
        reason: err.message,
      });
    }
    throw err;
  }
}
