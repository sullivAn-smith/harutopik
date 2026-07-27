import { reportClientEvent } from "@/lib/observability/client";

window.addEventListener("error", (event) => {
  reportClientEvent({
    name: "client_error",
    path: window.location.pathname,
    properties: { message: event.message.slice(0, 300) },
  });
});

window.addEventListener("unhandledrejection", () => {
  reportClientEvent({
    name: "unhandled_rejection",
    path: window.location.pathname,
  });
});

export function onRouterTransitionStart(
  url: string,
  navigationType: "push" | "replace" | "traverse",
) {
  const path = new URL(url, window.location.origin).pathname;
  reportClientEvent({
    name: "page_navigation",
    path,
    properties: { navigationType },
  });
}
