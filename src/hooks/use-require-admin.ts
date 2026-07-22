"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";

/**
 * Explicit page-level Admin guard (defense in depth alongside the middleware and
 * the route-prefix RouteGuard). Redirects a non-Admin to the access-denied page
 * and returns whether the current user is an Admin, so a page can withhold its
 * content until the check passes:
 *
 *   const isAdmin = useRequireAdmin();
 *   if (!isAdmin) return null;
 */
export function useRequireAdmin(): boolean {
  const { isAdmin } = useSession();
  const router = useRouter();

  React.useEffect(() => {
    if (!isAdmin) router.replace("/forbidden");
  }, [isAdmin, router]);

  return isAdmin;
}
