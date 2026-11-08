import { defineConfig, devices } from "@playwright/test";

const passphrase = "pilot-passphrase-for-tests";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: { ...devices["Desktop Chrome"] },
  projects: [
    { name: "flag-off", testMatch: /holding/, use: { baseURL: "http://127.0.0.1:3100" } },
    { name: "flag-on", testMatch: /workspace/, use: { baseURL: "http://127.0.0.1:3101" } },
  ],
  webServer: [
    {
      command: "npx next dev --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        FEATURE_REVIEW_READY_AD_PACK: "false",
        ADVERITY_DB: "data/e2e-off.sqlite",
        ADVERITY_ORIGIN: "http://127.0.0.1:3100",
      },
    },
    {
      command: "rm -f data/e2e.sqlite && npx next dev --port 3101",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        FEATURE_REVIEW_READY_AD_PACK: "true",
        MODEL_ADAPTER: "fixture",
        EVIDENCE_MODE: "fixture",
        ADVERITY_PILOT_PASSPHRASE: passphrase,
        ADVERITY_DB: "data/e2e.sqlite",
        ADVERITY_ORIGIN: "http://127.0.0.1:3101",
      },
    },
  ],
});
