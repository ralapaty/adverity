import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync("Dockerfile", "utf8");
const ignore = readFileSync(".dockerignore", "utf8");
const compose = readFileSync("docker-compose.yml", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");

describe("container contract (R1–R8)", () => {
  it("builds Node 22 as a non-root user with the product flag off", () => {
    expect(dockerfile).toContain("FROM node:22-bookworm-slim AS run");
    expect(dockerfile).toMatch(/^USER node$/m);
    expect(dockerfile).toContain("FEATURE_REVIEW_READY_AD_PACK=false");
    expect(dockerfile).toContain("ADVERITY_DB=/var/data/adverity.sqlite");
    expect(dockerfile).toContain("HOSTNAME=0.0.0.0");
    expect(dockerfile).toContain("/api/feature-flags");
    expect(dockerfile).not.toMatch(/MODEL_API_KEY\s*=/);
    expect(dockerfile).not.toMatch(/ADVERITY_PILOT_PASSPHRASE\s*=/);
    expect(nextConfig).toContain('output: "standalone"');
  });

  it("keeps secrets and local data out of the build context and the compose file", () => {
    expect(ignore).toMatch(/^\.env$/m);
    expect(ignore).toContain("data");
    expect(ignore).toContain("node_modules");
    expect(compose).toContain("FEATURE_REVIEW_READY_AD_PACK");
    expect(compose).toContain('"false"');
    expect(compose).toContain("/var/data");
    expect(compose).not.toMatch(/MODEL_API_KEY\s*:/);
    expect(compose).not.toMatch(/ADVERITY_PILOT_PASSPHRASE\s*:/);
  });
});
