import { googleCountedLength } from "./google-count";

export const SEARCH_CSV_HEADER =
  '"Campaign","Ad group","Keyword","Criterion Type","Ad type","Final URL","Path 1","Path 2","Headline 1","Headline 1 position","Headline 2","Headline 2 position","Headline 3","Headline 4","Headline 5","Headline 6","Headline 7","Headline 8","Headline 9","Headline 10","Headline 11","Headline 12","Headline 13","Headline 14","Headline 15","Description 1","Description 2","Description 3","Description 4"';

export const PMAX_HANDOFF_LABEL = "Draft asset handoff — Editor import compatibility not verified.";

export const IMPORT_NOTE = "Import has not been tested.";

const BENEFIT_ROLES = new Set(["outcome", "problem", "benefit"]);

export const GENERIC_PHRASES = [
  "unlock your potential",
  "experience the difference",
  "discover a smarter way",
  "revolutionary technology",
  "the ultimate solution",
  "transform your experience",
  "take it to the next level",
  "innovative solutions for you",
  "game-changer",
];

export type KeywordRow = { text: string; criterion: "Exact" | "Phrase" | "Broad" };

export type HandoffAsset = { kind: string; text: string; flags: string[]; evidenceIds: string[] };

function plain(text: string): string {
  return text.replace(/[\r\n\t]/g, " ");
}

function quote(value: string): string {
  const cleaned = plain(value);
  const safe = /^\s*[=+\-@]/.test(cleaned) ? `'${cleaned}` : cleaned;
  return `"${safe.replaceAll('"', '""')}"`;
}

function roleOf(flags: string[]): string | null {
  const flag = flags.find((item) => item.startsWith("role:"));
  return flag ? flag.slice(5) : null;
}

export function benefitRoleCount(assets: HandoffAsset[]): number {
  return assets.filter((asset) => asset.kind === "headline" && BENEFIT_ROLES.has(roleOf(asset.flags) || "")).length;
}

export function pathProblems(paths: string[]): string[] {
  if (paths.length !== 2) return ["Two paths are required before a Search export. None were invented."];
  const problems: string[] = [];
  for (const path of paths) {
    if (path.includes("/") || path.includes(" ")) problems.push(`Path "${path}" must use hyphens and must not contain a slash or a space.`);
    if (googleCountedLength(path) > 15) problems.push(`Path "${path}" is over 15 characters and was not truncated.`);
  }
  return problems;
}

export function handoffProblems(input: {
  campaignType: "search" | "performance_max";
  adGroup: string;
  destinationUrl: string;
  paths: string[];
  assets: HandoffAsset[];
  businessName?: string;
}): string[] {
  const problems: string[] = [];
  if (googleCountedLength(input.adGroup) > 30) problems.push("The ad group name is over 30 characters.");
  if (!input.destinationUrl) problems.push("The destination URL is missing. No URL was invented.");
  for (const asset of input.assets) {
    const lower = asset.text.toLowerCase();
    if (GENERIC_PHRASES.some((phrase) => lower.includes(phrase))) problems.push(`Excluded a generic phrase from “${asset.text}”.`);
    if (roleOf(asset.flags) === "proof" && asset.evidenceIds.length === 0) {
      problems.push("A proof headline has no evidence id.");
    }
  }
  if (input.campaignType === "search") {
    if (benefitRoleCount(input.assets) < 6) {
      problems.push("Fewer than six headlines are outcome, problem, or benefit lines. No benefit was invented to fill the count.");
    }
    problems.push(...pathProblems(input.paths));
  } else {
    const headlines = input.assets.filter((asset) => asset.kind === "headline");
    const longs = input.assets.filter((asset) => asset.kind === "long_headline");
    const descriptions = input.assets.filter((asset) => asset.kind === "description");
    if (headlines.length !== 15 || longs.length !== 5 || descriptions.length !== 5) {
      problems.push("The Performance Max text pack is incomplete.");
    }
    if (!headlines.some((asset) => googleCountedLength(asset.text) <= 15)) problems.push("Performance Max needs one headline of 15 characters or fewer.");
    if (!descriptions.some((asset) => googleCountedLength(asset.text) <= 60)) problems.push("Performance Max needs one description of 60 characters or fewer.");
    if (longs.some((asset) => googleCountedLength(asset.text) > 90)) problems.push("A long headline is over 90 characters and was not truncated.");
    if (googleCountedLength(input.businessName || "") > 25) problems.push("The business name is over 25 characters.");
  }
  return problems;
}

export function buildSearchCsv(input: {
  campaign: string;
  adGroup: string;
  finalUrl: string;
  paths: [string, string];
  headlines: string[];
  descriptions: string[];
  keywords: KeywordRow[];
}): string {
  const blank = Array.from({ length: 29 }, () => quote(""));
  const ad = [...blank];
  ad[0] = quote(input.campaign);
  ad[1] = quote(input.adGroup);
  ad[4] = quote("Responsive search ad");
  ad[5] = quote(input.finalUrl);
  ad[6] = quote(input.paths[0]);
  ad[7] = quote(input.paths[1]);
  const headlineSlots = [8, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  input.headlines.slice(0, 15).forEach((text, index) => {
    ad[headlineSlots[index]] = quote(text);
  });
  input.descriptions.slice(0, 4).forEach((text, index) => {
    ad[25 + index] = quote(text);
  });
  const lines = [SEARCH_CSV_HEADER, ad.join(",")];
  for (const keyword of input.keywords) {
    const row = [...blank];
    row[0] = quote(input.campaign);
    row[1] = quote(input.adGroup);
    row[2] = quote(keyword.text.replace(/^\[|\]$/g, "").replace(/^"|"$/g, ""));
    row[3] = quote(keyword.criterion);
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

export function buildPmaxHandoff(input: { headlines: string[]; longHeadlines: string[]; descriptions: string[]; themes: string[] }): string {
  const lines = [
    PMAX_HANDOFF_LABEL,
    "Headlines",
    ...input.headlines.map((text, index) => `${index + 1}. ${plain(text)}`),
    "Long headlines",
    ...input.longHeadlines.map((text, index) => `${index + 1}. ${plain(text)}`),
    "Descriptions",
    ...input.descriptions.map((text, index) => `${index + 1}. ${plain(text)}`),
    "Search themes",
    ...input.themes.map((text) => `- ${plain(text)}`),
  ];
  return lines.join("\n");
}
