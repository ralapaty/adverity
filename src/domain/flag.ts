export function isReviewPackEnabled(env: Record<string, string | undefined>): boolean {
  return env.FEATURE_REVIEW_READY_AD_PACK === "true";
}
