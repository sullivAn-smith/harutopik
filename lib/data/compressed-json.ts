import "server-only";

import { gzipSync, gunzipSync } from "node:zlib";

export function compressJson(value: unknown) {
  return gzipSync(JSON.stringify(value)).toString("base64");
}

export function decompressJson<T>(value: string): T {
  return JSON.parse(
    gunzipSync(Buffer.from(value, "base64")).toString("utf8"),
  ) as T;
}
