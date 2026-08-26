import { test, expect } from "@playwright/test";

test("Spanish landing leads to registration", async ({ page }) => {
  await page.goto("/es");
  await expect(page.getByRole("heading", { name: /tu historia merece/i })).toBeVisible();
  await page.getByRole("link", { name: /empieza tu historia/i }).first().click();
  await expect(page).toHaveURL(/\/es\/register/);
});

test("language switcher changes the public landing language", async ({ page }) => {
  await page.goto("/es");
  await page.getByRole("button", { name: "EN" }).first().click();
  await expect(page).toHaveURL(/\/en/);
  await expect(page.getByRole("heading", { name: /your story deserves/i })).toBeVisible();
});
