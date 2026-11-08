import { describe, expect, it } from "vitest";
import { contentHash } from "./hash";

const base = {
  locale: "en-GB",
  destinationUrl: "https://healthcrew.ai/",
  offerSummary: "Design-partner conversation",
  playbookVersionId: "pb-en-gb-1",
  assets: [
    { kind: "headline" as const, position: 1, text: "HealthCrew AI", angle: "distinctive_clear", evidenceIds: ["ev_1"] },
  ],
};

describe("content hash (R14)", () => {
  it("changes when ad text changes and stays stable for key order", () => {
    const first = contentHash(base);
    const second = contentHash({
      ...base,
      assets: [{ ...base.assets[0], text: "HealthCrew AI." }],
    });
    expect(first).not.toBe(second);
    expect(contentHash(base)).toBe(first);
  });

  it("changes when the destination changes", () => {
    expect(contentHash({ ...base, destinationUrl: "https://healthcrew.ai/partners" })).not.toBe(contentHash(base));
  });
});
