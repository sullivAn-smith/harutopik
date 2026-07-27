"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportClientEvent } from "@/lib/observability/client";

const reportWebVital: Parameters<typeof useReportWebVitals>[0] = (metric) => {
  reportClientEvent({
    name: "web_vital",
    path: window.location.pathname,
    properties: {
      metric: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      navigationType: metric.navigationType,
    },
  });
};

export function WebVitals() {
  useReportWebVitals(reportWebVital);
  return null;
}
