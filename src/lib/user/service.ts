import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { UserRole } from "@/lib/types";
import { hashPassword, validatePasswordPolicy } from "@/lib/auth/password";
import { logActivity } from "@/lib/auth/audit";

/** Raised on invalid user input (400), missing user (404), or duplicate (409). */
export class UserError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "UserError";
  }
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  siteId: string | null;
  mustChangePassword: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  siteId: string | null;
}

async function assertEmailUnique(email: string, exceptId?: string) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
    .limit(1);
  if (row && row.id !== exceptId) {
    throw new UserError(409, `Email "${email}" sudah terdaftar.`);
  }
}

/**
 * Create a user (Admin-provisioned). A Storeman must be bound to a site; an
 * Admin must not be. The temporary password must be changed on first login.
 * Records a create_user audit entry automatically.
 */
export async function createUser(
  input: CreateUserInput,
  actorUserId: string | null = null,
): Promise<UserDTO> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) throw new UserError(400, "Nama wajib diisi.");
  if (!email) throw new UserError(400, "Email wajib diisi.");

  const policy = validatePasswordPolicy(input.password);
  if (policy) throw new UserError(400, policy);

  if (input.role === "storeman" && !input.siteId) {
    throw new UserError(400, "Storeman wajib terikat ke sebuah site.");
  }
  const siteId = input.role === "admin" ? null : input.siteId;

  await assertEmailUnique(email);

  const passwordHash = await hashPassword(input.password);
  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role: input.role,
      siteId,
      mustChangePassword: 1,
    })
    .returning({ id: users.id });

  await logActivity({
    userId: actorUserId,
    action: "create_user",
    resourceTarget: `user:${email}`,
    detail: `Membuat akun ${input.role} untuk ${name}.`,
  });

  return {
    id: created.id,
    name,
    email,
    role: input.role,
    siteId,
    mustChangePassword: true,
  };
}

/** Reset a user's password to a new temporary one; forces change on next login. */
export async function resetUserPassword(
  id: string,
  newPassword: string,
  actorUserId: string | null = null,
): Promise<void> {
  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!existing) throw new UserError(404, "Pengguna tidak ditemukan.");

  const policy = validatePasswordPolicy(newPassword);
  if (policy) throw new UserError(400, policy);

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: 1, updatedAt: new Date() })
    .where(eq(users.id, id));

  await logActivity({
    userId: actorUserId,
    action: "reset_password",
    resourceTarget: `user:${existing.email}`,
    detail: "Reset password menjadi password sementara.",
  });
}

/** Update a user's editable fields (name, role, site). Auto-logs the change. */
export async function updateUser(
  id: string,
  patch: { name?: string; role?: UserRole; siteId?: string | null },
  actorUserId: string | null = null,
): Promise<void> {
  const [existing] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!existing) throw new UserError(404, "Pengguna tidak ditemukan.");

  const role = patch.role ?? existing.role;
  const siteId =
    role === "admin" ? null : (patch.siteId ?? undefined);
  if (role === "storeman" && siteId === null) {
    throw new UserError(400, "Storeman wajib terikat ke sebuah site.");
  }

  await db
    .update(users)
    .set({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.role !== undefined ? { role } : {}),
      ...(siteId !== undefined ? { siteId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  await logActivity({
    userId: actorUserId,
    action: "update_user",
    resourceTarget: `user:${existing.email}`,
    detail: "Memperbarui data pengguna.",
  });
}
