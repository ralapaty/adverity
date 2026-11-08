import { describe, expect, it, vi } from "vitest";
import { createFixtureModel } from "../adapters/fixture-model";
import { PRIVATE_PLAYBOOK_SENTINEL } from "./playbook";
import { runPipeline, ModelUnavailable, type ModelAdapter, type PipelineInput } from "./pipeline";

const input: PipelineInput = {
  productUrl: "https://healthcrew.ai/",
  destinationUrl: "https://healthcrew.ai/contact",
  brief: "UK English search ads for agency owners exploring recruitment technology.",
  advertiser: "HealthCrew.ai",
  userType: "freelance",
  objective: "Platform discovery",
  audience: "Healthcare staffing-agency owners",
  adGroup: "healthcare recruitment software",
  keywordThemes: ["healthcare recruitment software", "nurse jobs"],
  locale: "en-GB",
  offerSummary: "Design-partner conversation",
};

function deps(adapter: ModelAdapter, fetchExcerpt = vi.fn(async () => ({ ok: true as const, excerpt: "A healthcare technology platform.", sourceUrl: "https://healthcrew.ai/" }))) {
  return {
    resolveHost: async () => ["93.184.216.34"],
    fetchExcerpt,
    adapter,
  };
}

describe("pipeline (R2, R5, R17, R18, R20, A4)", () => {
  it("grounds a HealthCrew draft, drops the unsubstantiated line, and flags the design-partner offer", async () => {
    const result = await runPipeline(input, deps(createFixtureModel()));
    expect(result.status).toBe("draft");
    expect(result.validationPassed).toBe(true);
    expect(result.modelCalls).toBe(3);
    expect(result.assets.filter((asset) => asset.kind === "headline")).toHaveLength(15);
    expect(result.assets.filter((asset) => asset.kind === "description")).toHaveLength(4);
    expect(result.assets.some((asset) => asset.text.includes("72 Hrs"))).toBe(false);
    expect(result.assets.some((asset) => asset.text === "Healthcare Hiring Platform")).toBe(true);
    expect(result.assets.some((asset) => asset.flags.includes("unconfirmed_offer"))).toBe(true);
    expect(result.critique[0]?.issue).toMatch(/substantiat/i);
    expect(result.intentMap.find((row) => row.keywordTheme === "nurse jobs")?.intentLabel).toBe("job_seeking");
    expect(result.intentMap.every((row) => row.researched === false)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(PRIVATE_PLAYBOOK_SENTINEL);
    expect(result.assets.some((asset) => /staffing agency services/i.test(asset.text))).toBe(false);
  });

  it("does not fetch or call the model for a metadata URL", async () => {
    const fetchExcerpt = vi.fn();
    const draft = vi.fn();
    const result = await runPipeline(
      { ...input, productUrl: "http://169.254.169.254/latest" },
      deps({ id: "mock", modelId: "mock", draft, criticise: vi.fn(), repair: vi.fn() }, fetchExcerpt),
    );
    expect(result.status).toBe("needs_input");
    expect(fetchExcerpt).not.toHaveBeenCalled();
    expect(draft).not.toHaveBeenCalled();
  });

  it("returns model_unavailable without invented assets when the adapter fails", async () => {
    const adapter: ModelAdapter = {
      id: "mock",
      modelId: "mock",
      draft: async () => {
        throw new ModelUnavailable("down");
      },
      criticise: vi.fn(),
      repair: vi.fn(),
    };
    const result = await runPipeline(input, deps(adapter));
    expect(result.status).toBe("model_unavailable");
    expect(result.assets).toHaveLength(0);
    expect(result.modelCalls).toBe(1);
  });

  it("keeps an over-long headline intact and blocks validation", async () => {
    const long = "This headline is deliberately longer than thirty";
    const adapter: ModelAdapter = {
      id: "mock",
      modelId: "mock",
      draft: async () => ({
        assets: [
          { kind: "headline", text: long, angle: "benefit_led", evidenceIds: ["ev_healthcrewai"] },
          ...Array.from({ length: 14 }, (_, index) => ({
            kind: "headline" as const,
            text: `Headline ${index + 1}`,
            angle: "benefit_led" as const,
            evidenceIds: ["ev_healthcrewai"],
          })),
          ...Array.from({ length: 4 }, (_, index) => ({
            kind: "description" as const,
            text: `Description ${index + 1} for the platform.`,
            angle: "distinctive_clear" as const,
            evidenceIds: ["ev_healthcrewai"],
          })),
        ],
      }),
      criticise: async () => ({ entries: [] }),
      repair: vi.fn(),
    };
    const result = await runPipeline(input, deps(adapter));
    expect(result.assets.some((asset) => asset.text === long)).toBe(true);
    expect(result.validationPassed).toBe(false);
    expect(result.status).toBe("validation_failed");
    expect(adapter.repair).not.toHaveBeenCalled();
  });

  it("discards private playbook text echoed by a hostile adapter", async () => {
    const adapter: ModelAdapter = {
      id: "hostile",
      modelId: "hostile",
      draft: async () => ({
        assets: [{ kind: "headline", text: PRIVATE_PLAYBOOK_SENTINEL, angle: "benefit_led", evidenceIds: [] }],
      }),
      criticise: async () => ({ entries: [{ beforeText: PRIVATE_PLAYBOOK_SENTINEL, issue: "leak", afterText: PRIVATE_PLAYBOOK_SENTINEL }] }),
      repair: async () => ({ assets: [{ kind: "headline", text: "Healthcare Hiring Platform", angle: "benefit_led", evidenceIds: [] }] }),
    };
    const result = await runPipeline(input, deps(adapter));
    expect(JSON.stringify(result)).not.toContain(PRIVATE_PLAYBOOK_SENTINEL);
    expect(result.assets.some((asset) => asset.text === "Healthcare Hiring Platform")).toBe(true);
  });
});
