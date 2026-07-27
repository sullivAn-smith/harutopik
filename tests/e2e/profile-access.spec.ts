import { expect, test } from "@playwright/test";

test.describe("learner profile access", () => {
  test("requires authentication before onboarding", async ({ page }) => {
    await page.goto("/bat-dau");

    await expect(page).toHaveURL(/\/dang-nhap/);
    await expect(
      page.getByRole("heading", {
        name: "Tiếp tục hành trình tiếng Hàn",
      }),
    ).toBeVisible();
  });

  test("requires authentication before editing a profile", async ({ page }) => {
    await page.goto("/tai-khoan/chinh-sua");

    await expect(page).toHaveURL(/\/dang-nhap/);
  });

  test("protects personal vocabulary on page and API", async ({
    page,
    request,
  }) => {
    await page.goto("/tu-cua-toi");
    await expect(page).toHaveURL(/\/dang-nhap/);

    const response = await request.get("/api/v1/vocabulary-lists");
    expect(response.status()).toBe(401);
  });
});
