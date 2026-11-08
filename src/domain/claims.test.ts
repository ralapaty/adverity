import { describe, expect, it } from "vitest";
import { scanAssetText } from "./claims";

describe("claim scan (R18, R20, G8)", () => {
  it("rejects an unsubstantiated hiring guarantee", () => {
    const result = scanAssetText("Hire Verified Nurses in 72 Hrs.");
    expect(result.prohibited).toBe(true);
  });

  it("flags an unconfirmed design-partner invitation", () => {
    const result = scanAssetText("Become a Design Partner");
    expect(result.prohibited).toBe(false);
    expect(result.unconfirmedOffer).toBe(true);
  });

  it("leaves a platform headline in place", () => {
    const result = scanAssetText("Healthcare Hiring Platform");
    expect(result.prohibited).toBe(false);
    expect(result.unconfirmedOffer).toBe(false);
  });
});
