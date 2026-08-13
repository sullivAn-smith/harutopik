import { describe, expect, it } from "vitest";
import {
  isMissingPublishedSummaryRpc,
  mapPublishedLessonSummaryRows,
} from "./admin-published-summary";

describe("published lesson admin summaries", () => {
  it("maps the lightweight RPC contract without exposing lesson payloads", () => {
    expect(mapPublishedLessonSummaryRows([{
      content_id: "lesson-1",
      slug: "bai-1",
      version: 3,
      title: "Giới thiệu",
      summary: "Tóm tắt",
      vocabulary_count: 55,
      dictation_count: 2,
      published_at: "2026-08-13T00:00:00.000Z",
    }])).toEqual([{
      contentId: "lesson-1",
      slug: "bai-1",
      version: 3,
      title: "Giới thiệu",
      summary: "Tóm tắt",
      vocabularyCount: 55,
      dictationCount: 2,
      publishedAt: "2026-08-13T00:00:00.000Z",
    }]);
  });

  it("only falls back when the new RPC has not been deployed", () => {
    expect(isMissingPublishedSummaryRpc({ code: "PGRST202" })).toBe(true);
    expect(isMissingPublishedSummaryRpc({ code: "42883" })).toBe(true);
    expect(isMissingPublishedSummaryRpc({ code: "42501" })).toBe(false);
    expect(isMissingPublishedSummaryRpc(null)).toBe(false);
  });
});
