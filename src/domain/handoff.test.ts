import { describe, expect, it } from "vitest";
import { buildPmaxHandoff, buildSearchCsv, handoffProblems, PMAX_HANDOFF_LABEL, SEARCH_CSV_HEADER } from "./handoff";

const headlines = Array.from({ length: 15 }, (_, index) => (index < 6 ? `Outcome line ${index + 1}` : `Solution line ${index + 1}`));
const descriptions = ["Primary benefit for the team.", "The problem and the platform.", "A reason to look.", "A next step to discuss."];

function fields(line: string): string[] {
  return [...line.matchAll(/"(?:[^"]|"")*"/g)].map((match) => match[0]);
}

describe("Search and Performance Max handoff (R24–R32)", () => {
  it("writes a 29-field Search file and strips match notation from keywords", () => {
    const csv = buildSearchCsv({
      campaign: "HealthCrew",
      adGroup: "care hiring software",
      finalUrl: "https://healthcrew.ai/",
      paths: ["hiring-tools", "next-step"],
      headlines,
      descriptions,
      keywords: [{ text: '"care software"', criterion: "Phrase" }],
    });
    const lines = csv.split("\n");
    expect(lines[0]).toBe(SEARCH_CSV_HEADER);
    expect(fields(lines[1])).toHaveLength(29);
    expect(lines[1]).toContain('"Responsive search ad"');
    expect(lines[1].split(',"","')[0]).not.toContain("Keyword");
    expect(fields(lines[2])[2]).toBe('"care software"');
    expect(fields(lines[2])[3]).toBe('"Phrase"');
    expect(csv).not.toContain("Not a tested Google Ads Editor import");
    expect(buildPmaxHandoff({ headlines: ["Short"], longHeadlines: ["A longer line"], descriptions: ["One"], themes: ["theme"] })).not.toContain(SEARCH_CSV_HEADER);
  });

  it("keeps a Search pack incomplete when fewer than six benefit-role headlines exist", () => {
    const problems = handoffProblems({
      campaignType: "search",
      adGroup: "healthcare recruitment software",
      destinationUrl: "https://healthcrew.ai/",
      paths: [],
      assets: headlines.map((text) => ({ kind: "headline", text, flags: ["role:solution"], evidenceIds: ["ev"] })),
    });
    expect(problems.some((item) => item.includes("six headlines"))).toBe(true);
    expect(problems.some((item) => item.includes("Two paths"))).toBe(true);
    expect(problems.some((item) => item.includes("30 characters"))).toBe(true);
  });

  it("rejects a made-up path, a generic phrase, and a proof line without evidence", () => {
    const problems = handoffProblems({
      campaignType: "search",
      adGroup: "care software",
      destinationUrl: "",
      paths: ["bad path", "ok-path"],
      assets: [
        { kind: "headline", text: "Unlock Your Potential", flags: ["role:benefit"], evidenceIds: ["ev"] },
        { kind: "headline", text: "Proven winner", flags: ["role:proof"], evidenceIds: [] },
      ],
    });
    expect(problems.some((item) => item.includes("destination"))).toBe(true);
    expect(problems.some((item) => item.includes("slash or a space"))).toBe(true);
    expect(problems.some((item) => item.includes("generic"))).toBe(true);
    expect(problems.some((item) => item.includes("proof"))).toBe(true);
  });

  it("labels a Performance Max file as an unverified handoff (R31)", () => {
    const body = buildPmaxHandoff({
      headlines: ["HealthCrew AI"],
      longHeadlines: ["A healthcare technology platform for recruitment teams."],
      descriptions: ["Contact HealthCrew AI to discuss your needs."],
      themes: ["healthcare recruitment software"],
    });
    expect(body.startsWith(PMAX_HANDOFF_LABEL)).toBe(true);
  });

  it("keeps a newline or a leading formula inside one quoted cell", () => {
    const csv = buildSearchCsv({
      campaign: "HealthCrew",
      adGroup: "care hiring software",
      finalUrl: "https://healthcrew.ai/",
      paths: ["hiring-tools", "next-step"],
      headlines: ["=Outcome line", ...headlines.slice(1)],
      descriptions,
      keywords: [{ text: "theme\nextra", criterion: "Phrase" }],
    });
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("\"'=Outcome line\"");
    expect(lines[2]).toContain("\"theme extra\"");
  });
});
