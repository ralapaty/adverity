import { test, expect } from "@playwright/test";

test("shows the holding page and does not open the workflow", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Review-ready Google Search ads");
  await expect(page.getByText("The session cookie is required to sign in.")).toBeVisible();
  await expect(page.getByText("Product metrics wait for a separate yes.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What does AdVerity do?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate a review-ready ad pack" })).toHaveCount(0);
  const flags = await request.get("/api/feature-flags");
  expect(await flags.json()).toEqual({ review_ready_ad_pack: false });
  const blocked = await request.post("/api/packs", { data: { brief: "no" } });
  expect(blocked.status()).toBe(404);
});
