export type ClientTelemetryEvent = {
  name: string;
  path: string;
  properties?: Record<string, string | number | boolean>;
};

export function reportClientEvent(event: ClientTelemetryEvent) {
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  const globalPrivacyControl =
    "globalPrivacyControl" in navigator &&
    navigator.globalPrivacyControl === true;
  if (!endpoint || globalPrivacyControl) return;

  const body = JSON.stringify({
    ...event,
    occurredAt: new Date().toISOString(),
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}
