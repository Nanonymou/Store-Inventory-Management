import type { SessionUser } from "./types";
import { MOCK_SITES } from "./mock-data";

/**
 * Mock session users for previewing role-based UI ahead of real auth. A
 * Storeman is bound to a single site; the Admin roams all sites.
 */
export const MOCK_STOREMAN: SessionUser = {
  id: "user-storeman-a",
  name: "Budi (Storeman)",
  role: "storeman",
  siteId: MOCK_SITES[0].id,
};

export const MOCK_ADMIN: SessionUser = {
  id: "user-admin",
  name: "Admin Pusat",
  role: "admin",
  siteId: null,
};
