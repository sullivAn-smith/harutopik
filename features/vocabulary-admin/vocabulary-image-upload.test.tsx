// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VocabularyImageUpload } from "./vocabulary-image-upload";

afterEach(cleanup);

describe("VocabularyImageUpload", () => {
  it("báo cho form và gửi giá trị rỗng khi bỏ ảnh hiện tại", () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <VocabularyImageUpload
        defaultValue="https://cdn.example.com/vocabulary.png"
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bỏ ảnh" }));

    expect(onValueChange).toHaveBeenCalledWith("");
    expect(
      container.querySelector<HTMLInputElement>('input[name="imageUrl"]')
        ?.value,
    ).toBe("");
    expect(screen.getByText("Ảnh xem trước sẽ xuất hiện ở đây")).toBeTruthy();
  });
});
