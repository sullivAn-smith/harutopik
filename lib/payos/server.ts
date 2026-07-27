import "server-only";

import { PayOS } from "@payos/node";

export function isPayOSConfigured() {
  return Boolean(
    process.env.PAYOS_CLIENT_ID &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_CHECKSUM_KEY,
  );
}

export function createPayOSClient() {
  if (!isPayOSConfigured()) {
    throw new Error("payOS chưa được cấu hình.");
  }
  return new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  });
}
