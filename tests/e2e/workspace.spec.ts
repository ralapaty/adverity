import { expect, test, type Page } from "@playwright/test";

const passphrase = "pilot-passphrase-for-tests";

async function signIn(page: Page, username: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("a practitioner, copy expert, and client approve one exact version", async ({ page }) => {
  await signIn(page, "practitioner");
  await page.getByRole("button", { name: "Generate a review-ready ad pack" }).click();
  await expect(page).toHaveURL(/\/packs\/pack_/);
  const packUrl = page.url();
  await expect(page.getByRole("status")).toContainText("Export is closed");
  await expect(page.getByRole("cell", { name: "Healthcare Hiring Platform" })).toBeVisible();
  await expect(page.getByText("13 characters")).toBeVisible();
  await expect(page.getByText(/not substantiated/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Download review extract" })).toHaveCount(0);

  await page.getByLabel("Comment").fill("Please confirm design-partner availability before launch.");
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByRole("status")).toContainText("Export is closed");

  await page.getByLabel("Role").selectOption("copy_expert");
  await page.getByLabel("Username").fill("copy-expert");
  await page.getByRole("button", { name: "Save assignment" }).click();
  await page.getByLabel("Role").selectOption("external_client");
  await page.getByLabel("Username").fill("external-client");
  await page.getByRole("button", { name: "Save assignment" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  await signIn(page, "copy-expert");
  await page.goto(packUrl);
  await page.getByRole("button", { name: "Approve exact version" }).click();
  await expect(page.getByRole("status")).toContainText("Export is closed");
  await page.getByRole("button", { name: "Sign out" }).click();

  await signIn(page, "external-client");
  await page.goto(packUrl);
  await page.getByLabel("I confirm the destination").check();
  await page.getByLabel("I confirm the offer, including any design-partner invitation").check();
  await page.getByRole("button", { name: "Approve exact version" }).click();
  await expect(page.getByRole("link", { name: "Download review extract" })).toBeVisible();
  const download = await page.request.get(new URL(`/api/packs/${packUrl.split("/").pop()}/export`, page.url()).toString());
  expect(download.status()).toBe(200);
  expect(await download.text()).toContain("Not a tested Google Ads Editor import");
});
