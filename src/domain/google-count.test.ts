import { describe, expect, it } from "vitest";
import { googleCountedLength } from "./google-count";

const fixtures: Array<[string, number]> = [
  ["HealthCrew AI", 13],
  ["Healthcare Hiring Software", 26],
  ["Tools for Staffing Agencies", 27],
  ["Become a Design Partner", 23],
  ["Explore HealthCrew AI, a healthcare technology platform for recruitment teams.", 78],
  ["An alpha-stage platform for healthcare hiring. Ask about becoming a design partner.", 83],
  ["Healthcare recruitment technology for care providers and staffing agencies.", 75],
  ["Help shape healthcare recruitment tools. Contact HealthCrew AI to discuss your needs.", 85],
  ["Hire Verified Nurses in 72 Hrs.", 31],
];

describe("Google-counted length (R8, A6)", () => {
  it.each(fixtures)("counts %j as %i", (text, count) => {
    expect(googleCountedLength(text)).toBe(count);
  });

  it("counts a wide CJK code point as 2 and does not trim", () => {
    expect(googleCountedLength("汉")).toBe(2);
    expect(googleCountedLength(" 汉 ")).toBe(4);
  });

  it("counts a fullwidth latin letter as 2", () => {
    expect(googleCountedLength("Ａ")).toBe(2);
  });

  it("counts an emoji as 2", () => {
    expect(googleCountedLength("👍")).toBe(2);
  });
});
