import { NextResponse } from "next/server";

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
