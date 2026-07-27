import type { Instrumentation } from "next";

export function register() {}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      level: "error",
      event: "server_request_error",
      message,
      path: request.path,
      routeType: context.routeType,
      routePath: context.routePath,
      timestamp: new Date().toISOString(),
    }),
  );
};
