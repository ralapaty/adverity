import { createHash } from "node:crypto";

export type HashAsset = {
  kind: "headline" | "description";
  position: number;
  text: string;
  angle: string;
  evidenceIds: string[];
};

export type HashInput = {
  locale: string;
  destinationUrl: string;
  offerSummary: string;
  playbookVersionId: string;
  assets: HashAsset[];
};

export function contentHash(input: HashInput): string {
  const canonical = {
    locale: input.locale,
    destinationUrl: input.destinationUrl,
    offerSummary: input.offerSummary,
    playbookVersionId: input.playbookVersionId,
    assets: [...input.assets]
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.position - b.position)
      .map((asset) => ({
        kind: asset.kind,
        position: asset.position,
        text: asset.text,
        angle: asset.angle,
        evidenceIds: [...asset.evidenceIds].sort(),
      })),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
