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

function pack(headlines: string[], evidenceId: string): DraftAsset[] {
  return [
    ...headlines.map((text, index) => ({
      kind: "headline" as const,
      text,
      angle: ANGLES[index % 3],
      evidenceIds: [evidenceId],
    })),
    ...CLEAN_DESCRIPTIONS.map((text, index) => ({
      kind: "description" as const,
      text,
      angle: ANGLES[index % 3],
      evidenceIds: [evidenceId],
    })),
  ];
}

function evidenceId(payload: ModelPayload): string {
  return payload.data.evidence[0]?.id ?? "ev_page";
}

/** Deterministic stand-in used in tests and local review. It does not call a network. */
export function createFixtureModel(): ModelAdapter {
  return {
    id: "fixture",
    modelId: "fixture-healthcrew-2026-11-08",
    async draft(payload) {
      const headlines = [...CLEAN_HEADLINES];
      headlines[7] = "Hire Verified Nurses in 72 Hrs.";
      return { assets: pack(headlines, evidenceId(payload)) };
    },
    async criticise() {
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
      return { assets: pack(CLEAN_HEADLINES, evidenceId(payload)) };
    },
  };
}
