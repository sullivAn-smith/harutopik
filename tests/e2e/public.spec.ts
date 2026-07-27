import { expect, test } from "@playwright/test";

test("trang chủ dẫn người học vào khóa TOPIK", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Harutopik/);
  await expect(page.getByRole("heading", { name: "Tiếng Hàn TH" })).toBeVisible();
  await page.getByLabel("Mở sách sơ cấp 1").click();
  await expect(page).toHaveURL(/\/courses\/topik-1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tiếng Hàn sơ cấp 1",
  );
});

test("bài học và chế độ luyện tập hoạt động", async ({ page }) => {
  await page.goto("/courses/topik-1/lessons/gioi-thieu");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /Trắc nghiệm/ }).click();
  await expect(page.getByRole("navigation", { name: "Chế độ học" })).toBeVisible();
});

test("nối từ hiển thị đáp án sau khi chọn sai", async ({ page }) => {
  await page.goto("/courses/topik-1/lessons/gioi-thieu");
  await page.getByRole("button", { name: /Nối từ/ }).click();

  await page.getByRole("button", { name: "한국", exact: true }).click();
  await page.getByRole("button", { name: "Việt Nam", exact: true }).click();

  await expect(page.getByText("Chưa đúng, thử lại nhé.")).toBeVisible();
  await expect(page.getByText(/có nghĩa đúng là/)).toContainText("Hàn Quốc");

  await page.getByRole("button", { name: "한국", exact: true }).click();
  await page.getByRole("button", { name: "Hàn Quốc", exact: true }).click();
  await expect(page.getByText("Chính xác!")).toBeVisible();
});

test("dịch câu khóa chiều thứ hai cho đến khi hoàn thành chiều đầu", async ({
  page,
}) => {
  await page.goto("/courses/topik-1/lessons/gioi-thieu");
  await page.getByRole("button", { name: /Dịch câu/ }).click();

  await page
    .getByRole("button", { name: /Tiếp tục: Hàn → Việt/ })
    .click();
  await expect(page.getByText(/Hãy nhập câu tiếng Hàn/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dịch sang tiếng Hàn" }),
  ).toBeVisible();

  await page
    .getByPlaceholder("Nhập câu dịch của bạn…")
    .fill("저는 베트남 사람입니다.");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await page
    .getByRole("button", { name: /Tiếp tục: Hàn → Việt/ })
    .click();

  await expect(
    page.getByRole("heading", { name: "Dịch sang tiếng Việt" }),
  ).toBeVisible();
  await expect(page.getByText(/Bước 2\/2/)).toBeVisible();
});

test("flashcard khôi phục đúng vị trí sau khi tải lại trang", async ({ page }) => {
  await page.goto("/courses/topik-1/lessons/gioi-thieu");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "Sau →" }).click();
  await expect(page.getByText("2 / 55", { exact: true })).toBeVisible();
  await page.reload();

  await expect(
    page.getByText("Đã khôi phục phiên học gần nhất"),
  ).toBeVisible();
  await expect(page.getByText("2 / 55", { exact: true })).toBeVisible();
});

test("API catalog dùng envelope ổn định", async ({ request }) => {
  const response = await request.get("/api/v1/catalog");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["x-request-id"]).toBeTruthy();
  const body = await response.json();
  expect(body.meta.apiVersion).toBe("1");
  expect(body.data.courses[0].slug).toBe("topik-1");
});

test("endpoint riêng tư từ chối người chưa đăng nhập", async ({ request }) => {
  const response = await request.get("/api/v1/me");
  expect([401, 503]).toContain(response.status());
  const body = await response.json();
  expect(body.error.code).toMatch(/UNAUTHENTICATED|AUTH_NOT_CONFIGURED/);
});

test("response có các security header bắt buộc", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("mobile có đường vào đăng nhập và nâng cấp", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Chỉ kiểm tra mobile");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Điều hướng di động" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pro" })).toBeVisible();
});
