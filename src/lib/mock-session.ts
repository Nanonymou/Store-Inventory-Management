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

/** Demo credentials wired to mock users, used by the mock login flow. */
interface MockCredential {
  email: string;
  password: string;
  user: SessionUser;
}

export const MOCK_CREDENTIALS: MockCredential[] = [
  { email: "admin@stokman.test", password: "admin123", user: MOCK_ADMIN },
  {
    email: "storeman.a@stokman.test",
    password: "storeman123",
    user: {
      id: "user-storeman-a",
      name: "Budi (Storeman Site A)",
      role: "storeman",
      siteId: MOCK_SITES[0].id,
    },
  },
];

/**
 * Validate credentials against the mock account list (case-insensitive email).
 * Returns the matching session user, or null when nothing matches. A stand-in
 * for the real authentication the Login backend will provide.
 */
export function authenticateMock(
  email: string,
  password: string,
): SessionUser | null {
  const normalized = email.trim().toLowerCase();
  const match = MOCK_CREDENTIALS.find(
    (c) => c.email === normalized && c.password === password,
  );
  return match ? match.user : null;
}
