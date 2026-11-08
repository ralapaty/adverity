import { describe, expect, it, vi } from "vitest";
import { fetchPublicExcerpt } from "./fetch";

describe("evidence fetch (R3)", () => {
  it("does not follow a redirect onto a metadata address", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } }));
    const result = await fetchPublicExcerpt("https://healthcrew.ai/", {
      resolveHost: async () => ["93.184.216.34"],
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses when a second lookup returns a private address", async () => {
    let calls = 0;
    const fetchImpl = vi.fn();
    const result = await fetchPublicExcerpt("https://example.com/", {
      resolveHost: async () => {
        calls += 1;
        return calls === 1 ? ["93.184.216.34"] : ["127.0.0.1"];
      },
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("strips scripts and returns visible text", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html><script>alert(1)</script><p>Healthcare technology platform</p></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }));
    const result = await fetchPublicExcerpt("https://example.com/", {
      resolveHost: async () => ["93.184.216.34"],
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.excerpt).toContain("Healthcare technology platform");
      expect(result.excerpt).not.toContain("alert");
    }
  });
});
