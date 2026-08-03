// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GrammarPointFileImport } from "./grammar-point-file-import";

afterEach(cleanup);

describe("GrammarPointFileImport", () => {
  it("nhập nhiều ví dụ trong một điểm ngữ pháp", async () => {
    const onImport = vi.fn();
    const { container } = render(
      <GrammarPointFileImport onImport={onImport} />,
    );
    const fileInput = container.querySelector('input[type="file"]');
    const csv = [
      "title,form,formula,explanation,example_korean,example_vietnamese,example_audio_url",
      '"Tiểu từ chủ đề","은/는","Danh từ + 은/는","Nêu chủ đề.","저는 학생이에요. | 오늘은 월요일이에요.","Tôi là học sinh. | Hôm nay là thứ Hai.",""',
    ].join("\n");

    fireEvent.change(fileInput!, {
      target: { files: [new File([csv], "grammar-points.csv", { type: "text/csv" })] },
    });

    expect(await screen.findByText(/Đã nhập 1 điểm ngữ pháp/)).toBeTruthy();
    expect(onImport).toHaveBeenCalledWith([
      {
        title: "Tiểu từ chủ đề",
        form: "은/는",
        formula: "Danh từ + 은/는",
        explanation: "Nêu chủ đề.",
        examples: [
          { korean: "저는 학생이에요.", vietnamese: "Tôi là học sinh.", audioUrl: "" },
          { korean: "오늘은 월요일이에요.", vietnamese: "Hôm nay là thứ Hai.", audioUrl: "" },
        ],
      },
    ]);
  });

  it("báo lỗi khi số ví dụ Hàn và Việt không khớp", async () => {
    const { container } = render(
      <GrammarPointFileImport onImport={vi.fn()} />,
    );
    const fileInput = container.querySelector('input[type="file"]');
    const csv = [
      "title,form,formula,explanation,example_korean,example_vietnamese",
      '"Chủ đề","은/는","N + 은/는","Nêu chủ đề.","문장 하나 | 문장 둘","Một câu"',
    ].join("\n");

    fireEvent.change(fileInput!, {
      target: { files: [new File([csv], "invalid.csv", { type: "text/csv" })] },
    });

    expect(await screen.findByText(/số ví dụ tiếng Hàn và tiếng Việt phải bằng nhau/)).toBeTruthy();
  });
});
