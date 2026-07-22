import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import { UserError, deleteUser, updateUser } from "@/lib/user/service";
import type { UserRole } from "@/lib/types";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/** PUT /api/users/:id — update a user's name/role/site (Admin only). */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = await requireAdminApi(`users:update:${id}`);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new UserError(400, "Body harus berupa JSON yang valid.");
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const role: UserRole | undefined =
      b.role === "admin" ? "admin" : b.role === "storeman" ? "storeman" : undefined;

    await updateUser(
      id,
      {
        name: typeof b.name === "string" ? b.name : undefined,
        role,
        siteId:
          b.siteId === null
            ? null
            : typeof b.siteId === "string"
              ? b.siteId
              : undefined,
      },
      admin.id,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "PUT");
  }
}

/** DELETE /api/users/:id — remove a user (Admin only; cannot delete self). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = await requireAdminApi(`users:delete:${id}`);
    if (admin.id === id) {
      throw new UserError(400, "Anda tidak dapat menghapus akun sendiri.");
    }
    await deleteUser(id, admin.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "DELETE");
  }
}

function errorResponse(err: unknown, method: string) {
  if (err instanceof AuthorizationError || err instanceof UserError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status },
    );
  }
  console.error(`[api/users/:id] ${method} failed:`, err);
  return NextResponse.json(
    { ok: false, error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}
