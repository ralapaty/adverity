/** Narrated walkthrough of the review-ready pack. The app must already be listening. */
const reel = {
  baseURL: "http://127.0.0.1:3210",
  slug: "grona-review-pack",
  voice: "Daniel",
  viewport: { width: 1280, height: 800 },
  scenes: [
    {
      id: "promise",
      narration:
        "AdVerity drafts the ads. The sign-off is the product. Evidence, a private draft, a critic, a character count, and two human approvals sit in front of any file. HealthCrew is the worked example, not a customer. A draft is not a launch, and it is not permission to spend.",
      async run(page, { gotoSettle }) {
        await gotoSettle(page, "http://127.0.0.1:3210/");
      },
    },
    {
      id: "sign-in",
      narration:
        "Pilot sign-in is a shared passphrase, not an enterprise identity provider. The role on a pack is assigned on the server, after the person is in.",
      async run(page) {
        await page.goto("http://127.0.0.1:3210/sign-in", { waitUntil: "domcontentloaded" });
        await page.getByLabel("Username").fill("practitioner");
        await page.getByLabel("Passphrase").fill("pilot-passphrase-for-tests");
      },
    },
    {
      id: "brief",
      narration:
        "The practitioner starts from the public page, the audience, and a brief that says do not advertise a staffing service. The offer stays a design-partner conversation until the route approver confirms it.",
      async run(page) {
        await page.getByRole("button", { name: "Sign in" }).click();
        await page.waitForURL("http://127.0.0.1:3210/");
        await page.locator("#generate-heading").scrollIntoViewIfNeeded();
      },
    },
    {
      id: "closed",
      narration:
        "Export is closed. The pack says an unsupported claim was excluded, and that fewer than six headlines are outcome, problem, or benefit lines. No benefit was invented to fill the count.",
      async run(page) {
        await page.getByRole("button", { name: "Generate a review-ready ad pack" }).click();
        await page.waitForURL(/\/packs\/pack_/);
      },
    },
    {
      id: "critic",
      narration:
        "The critic removed the line about hiring verified nurses in seventy-two hours. That claim was not substantiated, and it blurred software with a staffing service. What remains is Healthcare Hiring Platform. Download stays unavailable. Approving this example still does not open an export.",
      async run(page) {
        await page.getByRole("heading", { name: "Critique" }).scrollIntoViewIfNeeded();
      },
    },
  ],
};

export default reel;
