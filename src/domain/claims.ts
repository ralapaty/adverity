export type ClaimScan = {
  prohibited: boolean;
  unconfirmedOffer: boolean;
  reasons: string[];
};

const PROHIBITED: Array<[RegExp, string]> = [
  [/\bguarantee[ds]?\b/i, "guarantee"],
  [/\bverif(?:ied|ication)\b/i, "verification"],
  [/\b\d+\s*(hrs|hours)\b/i, "hiring timeline"],
  [/\bcertifi(?:ed|cation)s?\b/i, "certification"],
  [/\btestimonial\b/i, "testimonial"],
  [/\b\d+\s*%\s*(off|saving|savings|cheaper)\b/i, "saving"],
  [/\bhire\b.{0,40}\bnurses?\b/i, "staffing offer"],
];

const UNCONFIRMED: Array<[RegExp, string]> = [
  [/design[-\s]?partner/i, "design-partner offer"],
  [/\balpha(?:-stage)?\b/i, "alpha availability"],
];

export function scanAssetText(text: string): ClaimScan {
  const reasons: string[] = [];
  let prohibited = false;
  let unconfirmedOffer = false;
  for (const [pattern, reason] of PROHIBITED) {
    if (pattern.test(text)) {
      prohibited = true;
      reasons.push(reason);
    }
  }
  for (const [pattern, reason] of UNCONFIRMED) {
    if (pattern.test(text)) {
      unconfirmedOffer = true;
      reasons.push(reason);
    }
  }
  return { prohibited, unconfirmedOffer, reasons };
}
