# Docker runtime — Kickoff

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Updated 8 November 2026. Branch `feat/docker-runtime`.

## Context

AdVerity is one Next.js process on Node 22 with SQLite at `ADVERITY_DB`. Render remains the recorded host (ADR 007). There is no image, and the Docker daemon is not running on this machine. This change packages that same process so an operator can build and run it locally, or hand the image to a host later. It does not turn the product flag on, replace Render, or move the database.

Zoho Projects is not connected. Task tracking is skipped. Vaiz is not used.

## Definition of Ready

- The image runs the existing `next build` output. No second application.
- `FEATURE_REVIEW_READY_AD_PACK` stays off unless an operator sets it at run time.
- Secrets stay out of the image and out of compose.
- SQLite stays one file on a mounted volume.
- A separate Docker feature flag is not proposed. Packaging is not a user-facing behaviour. The existing product flag remains the release gate. That waiver needs this design sign-off.

## Success metric

A built container answers `GET /api/feature-flags` with `review_ready_ad_pack: false` and does not contain `MODEL_API_KEY` or the pilot passphrase. Baseline today: there is no image.
