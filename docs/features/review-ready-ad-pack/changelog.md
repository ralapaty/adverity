# Changelog

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Unreleased

The holding page, sign-in, workspace, and pack page now lead with the five checks and the closed export. Labels on the pack page are readable. The HealthCrew example still cannot invent a benefit, so its export stays closed. A narrated product reel is in `exports/`.

## 0.2.0 — 2026-11-08

The runtime host is Render, with SQLite on a persistent disk and the feature flag still off in `render.yaml`. Requirements R24–R33 add the Search handoff and the Performance Max text label. The illustrative HealthCrew pack stays short of six outcome, problem, or benefit headlines, so its export stays closed. Headline roles survive an edit. The workspace collects paths, and a Performance Max business name is confirmed by the route approver rather than by the create request.

Sign-in is limited after repeated failures. Production responses send HSTS. A signed-in person can withdraw product-metric consent, download the packs they created, and delete those packs. Packs older than 90 days are removed when the database opens, unless retention is set to 0. These controls are not a certification or a completed legal review.

A Dockerfile and compose file package the same Node 22 process. The image defaults the product flag to off, runs as a non-root user, and keeps SQLite on a volume. Render's blueprint is unchanged. The image has not been deployed.

## 0.1.0 — 2026-11-08

First build of the review-ready Google Search ad pack. The feature flag `FEATURE_REVIEW_READY_AD_PACK` defaults off. While it is off, the site shows a holding page and does not fetch pages, call a model, or store packs.

With the flag on, one advertiser, one ad group, and a chosen locale can move through evidence, draft, critique, repair, character checks, copy-expert approval, and client or internal-owner approval. Export is a review extract bound to that version.
