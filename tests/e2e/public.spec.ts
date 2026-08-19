import { expect, test } from "@playwright/test";

test("trang chủ dẫn người học vào bộ giáo trình", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Harutopik/);
  await expect(
    page.getByRole("heading", { name: "Hôm nay bạn muốn học gì?" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Mở bộ 1" }).click();
  await expect(page).toHaveURL(/\/thu-vien\/1$/);
  await expect(page.getByRole("heading", { name: "Bộ 1" })).toBeVisible();
});

test("bài học yêu cầu đăng nhập và giữ đúng đường quay lại", async ({ page }) => {
  await page.goto("/courses/topik-1/lessons/gioi-thieu");
  await expect(page).toHaveURL(
    /\/dang-nhap\?next=%2Fcourses%2Ftopik-1%2Flessons%2Fgioi-thieu$/,
  );
  await expect(
    page.getByRole("heading", { name: "Tiếp tục hành trình tiếng Hàn" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Đăng ký miễn phí" }),
  ).toHaveAttribute(
    "href",
    "/dang-ky?next=%2Fcourses%2Ftopik-1%2Flessons%2Fgioi-thieu",
  );
});

test("API catalog dùng envelope ổn định", async ({ request }) => {
  const response = await request.get("/api/v1/catalog");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["x-request-id"]).toBeTruthy();
  const body = await response.json();
  expect(body.meta.apiVersion).toBe("1");
  expect(body.data.courses).toEqual(
    expect.arrayContaining([expect.objectContaining({ slug: "topik-1" })]),
  );
  const firstPublishedLesson = body.data.courses
    .flatMap((course: { lessons?: unknown[] }) => course.lessons ?? [])
    .find((lesson: { status?: string }) => lesson.status === "published");
  expect(firstPublishedLesson).toEqual(expect.objectContaining({
    vocabulary: expect.any(Array),
    grammar: expect.any(Array),
    exercises: expect.any(Array),
  }));
});

test("thư viện kiến thức giữ danh sách và nội dung chi tiết", async ({ page }) => {
  await page.goto("/kien-thuc");
  await expect(
    page.getByRole("heading", { name: "Kiến thức nền tảng" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Số thuần Hàn/ }).click();
  await expect(page).toHaveURL(/\/kien-thuc\/so-thuan-han$/);
  await expect(page.getByRole("heading", { name: "Số thuần Hàn" })).toBeVisible();
  await expect(page.getByText("하나", { exact: true })).toBeVisible();
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

test("mobile khách có điều hướng học tập và đăng nhập", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Chỉ kiểm tra mobile");
  await page.goto("/");
  const accountNavigation = page.getByRole("navigation", { name: "Điều hướng di động" });
  await expect(accountNavigation).toBeVisible();
  await expect(accountNavigation.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/dang-nhap");
  const mobileNavigation = page.getByRole("navigation", {
    name: "Điều hướng chính trên điện thoại",
  });
  await expect(mobileNavigation.getByRole("link", { name: "Trang chủ" })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Học" })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Bộ từ" })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Luyện đề" })).toBeVisible();
});
