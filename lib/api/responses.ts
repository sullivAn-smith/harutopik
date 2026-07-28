import { NextResponse } from "next/server";
import { toUserFacingError } from "@/lib/errors/user-facing";

export const apiVersion = "1";

export function apiSuccess<T>(
  data: T,
  options: { status?: number; cacheControl?: string } = {},
) {
  const requestId = crypto.randomUUID();
  return NextResponse.json(
    { data, meta: { apiVersion, requestId } },
    {
      status: options.status ?? 200,
      headers: {
        "x-request-id": requestId,
        ...(options.cacheControl
          ? { "cache-control": options.cacheControl }
          : {}),
      },
    },
  );
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  const requestId = crypto.randomUUID();
  return NextResponse.json(
    {
      error: { code, message, ...(details ? { details } : {}) },
      meta: { apiVersion, requestId },
    },
    { status, headers: { "x-request-id": requestId } },
  );
}

export function apiBackendError(
  error: unknown,
  fallback: string,
) {
  const friendly = toUserFacingError(error, fallback);
  const status =
    friendly.code === "FORBIDDEN"
      ? 403
      : friendly.code.endsWith("_NOT_FOUND") || friendly.code === "NOT_FOUND"
        ? 404
        : friendly.code === "DUPLICATE" ||
            friendly.code === "CONCURRENT_UPDATE"
          ? 409
          : friendly.code === "INVALID_VALUE" ||
              friendly.code === "REQUIRED_VALUE_MISSING"
            ? 400
            : friendly.code === "DATABASE_SCHEMA_OUTDATED" ||
                friendly.code === "TIMEOUT"
              ? 503
              : 500;
  return apiError(
    friendly.code,
    friendly.message,
    status,
    friendly.reference ? { reference: friendly.reference } : undefined,
  );
}
