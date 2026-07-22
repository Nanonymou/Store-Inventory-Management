import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import {
  TransferError,
  createTransfer,
  parseCreateTransfer,
} from "@/lib/transfer/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * POST /api/transfers — create an inter-site stock transfer (Admin only).
 * Validates the sites, item, and origin stock, records the transfer as pending,
 * and logs it. Non-Admin requests are denied (403) and audited.
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdminApi("transfers:create");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new TransferError(400, "Body harus berupa JSON yang valid.");
    }

    const input = parseCreateTransfer(body);
    const transfer = await createTransfer(input, admin.id);

    return NextResponse.json({ ok: true, transfer }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthorizationError || err instanceof TransferError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/transfers] POST failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
