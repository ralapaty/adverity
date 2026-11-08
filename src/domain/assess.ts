import { scanAssetText } from "./claims";
import { contentHash, type HashAsset } from "./hash";
import { DESCRIPTION_LIMIT, googleCountedLength, HEADLINE_LIMIT } from "./google-count";
import { PLAYBOOK_ID } from "./playbook";

export type AssessedAsset = HashAsset & {
  flags: string[];
  googleCount: number | null;
};

export function assessAssets(
  assets: HashAsset[],
  context: { locale: string; destinationUrl: string; offerSummary: string; campaignType?: "search" | "performance_max" },
): {
  assets: AssessedAsset[];
  validationPassed: boolean;
  incomplete: boolean;
  unconfirmedOffer: boolean;
  contentHash: string | null;
  limitations: string[];
} {
  const limitations: string[] = [];
  let unconfirmedOffer = false;
  const assessed: AssessedAsset[] = assets.map((asset) => {
    const scan = scanAssetText(asset.text);
    const googleCount = googleCountedLength(asset.text);
    const limit = asset.kind === "headline" ? HEADLINE_LIMIT : DESCRIPTION_LIMIT;
    const flags: string[] = [];
    if (scan.prohibited) flags.push("prohibited");
    if (scan.unconfirmedOffer) {
      flags.push("unconfirmed_offer");
      unconfirmedOffer = true;
    }
    if (googleCount > limit) flags.push("over_limit");
    return { ...asset, flags, googleCount };
  });
  const headlines = assessed.filter((asset) => asset.kind === "headline");
  const descriptions = assessed.filter((asset) => asset.kind === "description");
  const longHeadlines = assessed.filter((asset) => asset.kind === "long_headline");
  const over = assessed.some((asset) => asset.flags.includes("over_limit") || asset.flags.includes("prohibited"));
  const pmax = context.campaignType === "performance_max";
  const incomplete = pmax ? headlines.length !== 15 || longHeadlines.length !== 5 || descriptions.length !== 5 : headlines.length !== 15 || descriptions.length !== 4;
  const validationPassed =
    !incomplete && !over && assessed.every((asset) => asset.evidenceIds.length > 0 && asset.googleCount !== null);
  if (unconfirmedOffer) limitations.push("Design-partner or alpha wording stays unconfirmed until a route approver confirms it.");
  if (assessed.some((asset) => asset.flags.includes("over_limit"))) {
    limitations.push("One or more assets exceed the character limit and were not truncated.");
  }
  if (assessed.some((asset) => asset.flags.includes("prohibited"))) {
    limitations.push("A manual edit includes an unsupported claim. Export stays closed.");
  }
  if (incomplete) limitations.push(pmax ? "The pack does not yet contain 15 headlines, 5 long headlines, and 5 descriptions." : "The pack does not yet contain 15 headlines and 4 descriptions.");
  const hash = assessed.length
    ? contentHash({
        locale: context.locale,
        destinationUrl: context.destinationUrl,
        offerSummary: context.offerSummary,
        playbookVersionId: PLAYBOOK_ID,
        assets: assessed,
      })
    : null;
  return { assets: assessed, validationPassed, incomplete, unconfirmedOffer, contentHash: hash, limitations };
}
