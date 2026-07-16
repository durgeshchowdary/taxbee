import { test, expect } from "@playwright/test";

test("TaxBee homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TaxBee|taxbee/i);
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("body")).toContainText(/login|sign in|email/i);
});