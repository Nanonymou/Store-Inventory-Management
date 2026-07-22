import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import {
  UserError,
  createUser,
  listUsers,
  type CreateUserInput,
} from "@/lib/user/service";
import type { UserRole } from "@/lib/types";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

function parseCreate(body: unknown): CreateUserInput {
  if (typeof body !== "object" || body === null) {
    throw new UserError(400, "Body permintaan tidak valid.");
  }
  const b = body as Record<string, unknown>;
  const role: UserRole = b.role === "admin" ? "admin" : "storeman";
  return {
    name: typeof b.name === "string" ? b.name : "",
    email: typeof b.email === "string" ? b.email : "",
    password: typeof b.password === "string" ? b.password : "",
    role,
    siteId:
      role === "admin"
        ? null
        : typeof b.siteId === "string" && b.siteId
          ? b.siteId
          : null,
  };
}

/** GET /api/users — list all users (Admin only). */
export async function GET() {
  try {
    await requireAdminApi("users:list");
    const users = await listUsers();
    return NextResponse.json({ ok: true, count: users.length, users });
  } catch (err) {
    return errorResponse(err, "GET");
  }
}

/** POST /api/users — create a user (Admin only). */
export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi("users:create");
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new UserError(400, "Body harus berupa JSON yang valid.");
    }
    const user = await createUser(parseCreate(body), admin.id);
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST");
  }
}

function errorResponse(err: unknown, method: string) {
  if (err instanceof AuthorizationError || err instanceof UserError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status },
    );
  }
  console.error(`[api/users] ${method} failed:`, err);
  return NextResponse.json(
    { ok: false, error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}
