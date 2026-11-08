import { describe, expect, it } from "vitest";
import { isReviewPackEnabled } from "./flag";

describe("FEATURE_REVIEW_READY_AD_PACK (N0a)", () => {
  it("is off when the variable is absent", () => {
    expect(isReviewPackEnabled({})).toBe(false);
  });

  it("is off for every value other than the exact string true", () => {
    for (const value of ["false", "TRUE", "1", "yes", " true", ""]) {
      expect(isReviewPackEnabled({ FEATURE_REVIEW_READY_AD_PACK: value })).toBe(false);
    }
  });

  it("is on only when the value is true", () => {
    expect(isReviewPackEnabled({ FEATURE_REVIEW_READY_AD_PACK: "true" })).toBe(true);
  });
});
