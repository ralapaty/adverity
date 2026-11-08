import { describe, expect, it, vi } from "vitest";
import { classifyUrl } from "./url-guard";

const publicResolver = vi.fn(async () => ["93.184.216.34"]);

describe("URL guard (R3, T5, T8)", () => {
  it("refuses non-http schemes and credentials", async () => {
    expect((await classifyUrl("file:///etc/passwd", publicResolver)).ok).toBe(false);
    expect((await classifyUrl("http://user:pass@example.com/", publicResolver)).ok).toBe(false);
  });

  it("refuses metadata, loopback, and private literals without trusting them", async () => {
    for (const raw of [
      "http://169.254.169.254/latest",
      "http://127.0.0.1/",
      "http://10.1.2.3/",
      "http://192.168.1.9/",
      "http://172.16.0.4/",
      "http://[::1]/",
    ]) {
      const result = await classifyUrl(raw, publicResolver);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("private");
    }
  });

  it("refuses a public name that resolves to a private address", async () => {
    const result = await classifyUrl("https://example.com/path", async () => ["169.254.169.254"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("private");
  });

  it("accepts a public https URL", async () => {
    const result = await classifyUrl("https://healthcrew.ai/", async () => ["93.184.216.34"]);
    expect(result.ok).toBe(true);
  });

  it("refuses other IPv6 literals, including deprecated compatible forms", async () => {
    for (const raw of ["http://[::127.0.0.1]/", "http://[2001:db8::1]/", "http://[::1]/"]) {
      const result = await classifyUrl(raw, publicResolver);
      expect(result.ok).toBe(false);
    }
  });

  it("refuses an IPv4-mapped loopback address", async () => {
    const result = await classifyUrl("http://[::ffff:127.0.0.1]/", publicResolver);
    expect(result.ok).toBe(false);
  });

  it("refuses metadata hostnames", async () => {
    const result = await classifyUrl("http://metadata.google.internal/", publicResolver);
    expect(result.ok).toBe(false);
  });
});
