import { test, expect } from "@playwright/test";

test("public archive is reachable without signing in", async ({ page }) => {
  await page.goto("/es/archive");
  await expect(page.getByRole("heading", { name: /vidas publicadas para ser leídas/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /solicitar la publicación/i })).toBeVisible();
  await expect(page.getByText(/momentos críticos/i)).toBeVisible();
});
