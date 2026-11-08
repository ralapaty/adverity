# Review-ready ad pack — Release notes

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

**Flag:** `FEATURE_REVIEW_READY_AD_PACK` default **off**. Enabling it does not require a new build. Set it in the server environment and restart only if the host reads environment variables at process start. The application reads the variable on each request.

**Who it is for:** freelance and in-house Google Ads subject-matter experts.

**0.3.0 — 2026-11-08.** The page leads with the five checks and a closed export. The HealthCrew example still does not invent a benefit, so its file stays closed. A narrated reel records that walkthrough. This is not a live campaign, a tested Editor import, or a result.

**0.2.0 — 2026-11-08.** Render is the recorded host. Search export uses the 29-column handoff. Performance Max is an unverified text handoff. Sign-in is limited, production responses send HSTS, and a signed-in person can withdraw consent, download their packs, and delete them. A Docker image packages the same process with the flag off. None of this is a certification, a live campaign, or a tested Editor import.

**Not in this release:** Grona campaigns, Google Ads publishing, ad spend, Editor-compatible import, a second locale without a language reviewer, model training, and enterprise single sign-on.

**Success metric:** median time from submit to the first version that passes the character validator. Baseline is unmeasured. The pilot target is five minutes on the illustrative en-GB brief. The metric is not a CTR or ROAS claim.

Operator steps: [../../ops/review-ready-ad-pack-devsecops-playbook.md](../../ops/review-ready-ad-pack-devsecops-playbook.md).
