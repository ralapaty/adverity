import type { DraftAsset, ModelAdapter, ModelPayload } from "../domain/pipeline";

const ANGLES = ["benefit_led", "distinctive_clear", "problem_aware"] as const;

export const CLEAN_HEADLINES = [
  "HealthCrew AI",
  "Healthcare Hiring Software",
  "Tools for Staffing Agencies",
  "Healthcare Recruitment Tech",
  "Explore HealthCrew AI",
  "Built for Healthcare Teams",
  "Technology, Not an Agency",
  "Healthcare Hiring Platform",
  "For Care Recruitment Teams",
  "Meet HealthCrew AI",
  "Explore Our Hiring Tools",
  "Help Shape HealthCrew AI",
  "Become a Design Partner",
  "UK Healthcare Hiring Tools",
  "Your Next Hiring Platform",
];

export const CLEAN_DESCRIPTIONS = [
  "Explore HealthCrew AI, a healthcare technology platform for recruitment teams.",
  "An alpha-stage platform for healthcare hiring. Ask about becoming a design partner.",
  "Healthcare recruitment technology for care providers and staffing agencies.",
  "Help shape healthcare recruitment tools. Contact HealthCrew AI to discuss your needs.",
];

function pack(headlines: string[], evidenceId: string, roles: string[]): DraftAsset[] {
  return [
    ...headlines.map((text, index) => ({
      kind: "headline" as const,
      text,
      angle: ANGLES[index % 3],
      evidenceIds: [evidenceId],
      role: roles[index] ?? "solution",
    })),
    ...CLEAN_DESCRIPTIONS.map((text, index) => ({
      kind: "description" as const,
      text,
      angle: ANGLES[index % 3],
      evidenceIds: [evidenceId],
    })),
  ];
}

const HONEST_ROLES = [
  "solution", "solution", "solution", "solution", "action", "solution", "difference", "solution",
  "solution", "action", "action", "action", "action", "solution", "solution",
];

function evidenceId(payload: ModelPayload): string {
  return payload.data.evidence[0]?.id ?? "ev_page";
}

function pmaxPack(id: string): DraftAsset[] {
  const headlines = ["HealthCrew AI", ...Array.from({ length: 14 }, (_, index) => `Platform line ${index + 2}`)];
  const roles = ["solution", ...Array.from({ length: 14 }, () => "solution")];
  return [
    ...pack(headlines, id, roles).filter((asset) => asset.kind === "headline"),
    ...Array.from({ length: 5 }, (_, index) => ({
      kind: "long_headline" as const,
      text: index === 0 ? "A healthcare technology platform for recruitment teams." : `Long platform line ${index + 1} for review`,
      angle: ANGLES[index % 3],
      evidenceIds: [id],
    })),
    { kind: "description", text: "Ask about the platform.", angle: "benefit_led", evidenceIds: [id] },
    ...CLEAN_DESCRIPTIONS.map((text, index) => ({ kind: "description" as const, text, angle: ANGLES[index % 3], evidenceIds: [id] })),
  ];
}

function eligiblePack(id: string): DraftAsset[] {
  const headlines = Array.from({ length: 15 }, (_, index) => (index < 6 ? `Outcome line ${index + 1}` : `Solution line ${index + 1}`));
  const roles = headlines.map((_, index) => (index < 6 ? "outcome" : "solution"));
  return pack(headlines, id, roles);
}

/** Deterministic stand-in used in tests and local review. It does not call a network. */
export function createFixtureModel(): ModelAdapter {
  return {
    id: "fixture",
    modelId: "fixture-healthcrew-2026-11-08",
    async draft(payload) {
      const id = evidenceId(payload);
      if (payload.data.campaignType === "performance_max") return { assets: pmaxPack(id) };
      if (payload.data.brief.includes("ROLE_QUOTA_FIXTURE")) return { assets: eligiblePack(id) };
      const headlines = [...CLEAN_HEADLINES];
      headlines[7] = "Hire Verified Nurses in 72 Hrs.";
      return { assets: pack(headlines, id, HONEST_ROLES) };
    },
    async criticise(payload) {
      if (payload.data.brief.includes("ROLE_QUOTA_FIXTURE") || payload.data.campaignType === "performance_max") return { entries: [] };
      return {
        entries: [
          {
            beforeText: "Hire Verified Nurses in 72 Hrs.",
            issue: "Implies verification and a hiring outcome this evidence has not substantiated, and blurs software with a staffing service.",
            afterText: "Healthcare Hiring Platform",
          },
        ],
      };
    },
    async repair(payload) {
      return { assets: pack(CLEAN_HEADLINES, evidenceId(payload), HONEST_ROLES) };
    },
  };
}
