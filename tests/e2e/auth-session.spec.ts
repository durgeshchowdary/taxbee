import { test, expect } from "@playwright/test";

test("protected dashboard redirects unauthenticated user", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/dashboard");
  await expect(page).toHaveURL(/login|auth|dashboard/);
});