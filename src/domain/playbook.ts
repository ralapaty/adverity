export const PLAYBOOK_ID = "pb-en-gb-1";

/** Private example text. It must never appear in a client response. */
export const PRIVATE_PLAYBOOK_SENTINEL = "PRIVATE_PLAYBOOK_EXAMPLE_DO_NOT_LEAK";

export type PlaybookRecord = { kind: "terminology" | "example" | "prohibited" | "pattern" | "locale_rule"; body: string };

export function selectPlaybook(locale: string): { id: string; locale: string; records: PlaybookRecord[] } {
  return {
    id: PLAYBOOK_ID,
    locale,
    records: [
      {
        kind: "terminology",
        body: "Describe a technology platform for recruitment teams. Do not describe the illustrative HealthCrew product as a staffing agency.",
      },
      { kind: "example", body: PRIVATE_PLAYBOOK_SENTINEL },
      {
        kind: "prohibited",
        body: "Exclude guaranteed timelines, verified hiring outcomes, savings, placeholder testimonials, and certification guarantees.",
      },
      {
        kind: "pattern",
        body: "Offer distinct benefit-led, distinctive-clear, and problem-aware lines. Problem-aware lines must not shame the reader.",
      },
      { kind: "locale_rule", body: "Use natural wording for the locale. Do not invent a local price, currency conversion, or eligibility rule." },
    ],
  };
}
