/**
 * Small typed fetch wrapper for the app's JSON API. Throws ApiError on non-2xx
 * responses (or an `{ ok: false }` body) so callers can surface `error`.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiEnvelope {
  ok: boolean;
  error?: string;
}

async function parse<T>(res: Response): Promise<T> {
  let body: (T & ApiEnvelope) | null = null;
  try {
    body = (await res.json()) as T & ApiEnvelope;
  } catch {
    // Non-JSON response.
  }
  if (!res.ok || (body && body.ok === false)) {
    const message =
      body?.error ?? `Permintaan gagal (${res.status}).`;
    throw new ApiError(res.status, message);
  }
  if (!body) {
    throw new ApiError(res.status, "Respons kosong dari server.");
  }
  return body;
}

/** GET a JSON endpoint. `params` are appended as a query string. */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const res = await fetch(url.toString(), {
    headers: { accept: "application/json" },
    credentials: "same-origin",
  });
  return parse<T>(res);
}

/** Send a JSON body with a mutating method (POST/PUT/PATCH/DELETE). */
export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      accept: "application/json",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    credentials: "same-origin",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parse<T>(res);
}
