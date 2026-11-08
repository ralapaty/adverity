import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const exec = promisify(execFile);

async function daemonUp(): Promise<boolean> {
  try {
    await exec("docker", ["info"], { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

describe("container image (R4, R5)", () => {
  it("builds and serves the flag-off health check when Docker answers", async () => {
    if (!(await daemonUp())) {
      console.info("Docker daemon is not running. Image build skipped.");
      return;
    }
    await exec("docker", ["build", "-t", "adverity:contract", "."], { timeout: 600_000 });
    const { stdout } = await exec(
      "docker",
      ["run", "--rm", "-p", "127.0.0.1:3310:3000", "-d", "--name", "adverity-contract", "adverity:contract"],
      { timeout: 30_000 },
    );
    const id = stdout.trim();
    try {
      let body = "";
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
          const response = await fetch("http://127.0.0.1:3310/api/feature-flags");
          body = await response.text();
          if (response.ok) break;
        } catch {
          body = "";
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      expect(JSON.parse(body)).toEqual({ review_ready_ad_pack: false });
    } finally {
      await exec("docker", ["rm", "-f", id]).catch(() => undefined);
    }
  }, 700_000);
});
