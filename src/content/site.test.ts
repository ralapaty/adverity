import { describe, expect, it } from "vitest";
import { FAQS, SITE } from "./site";

describe("public copy (N3)", () => {
  it("states the product without pricing or performance claims", () => {
    const text = [SITE.description, ...FAQS.map((item) => item.answer)].join(" ");
    expect(text).toContain("subject-matter experts");
    expect(text).not.toMatch(/ROAS|CTR|£|\$\d|pricing/i);
  });
});
