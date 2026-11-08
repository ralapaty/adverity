# ADR 007: Render hosts the Next.js runtime

- Status: accepted
- Date: 2026-11-08
- Deciders: Basava Rajendra Alapaty (design sign-off still open)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

The review-ready pack already runs as one Next.js process with SQLite (ADR 004 and ADR 006). No production host was recorded. The operator decision on 8 November 2026 is that this runtime lives on Render. The skill's Hostinger and Hetzner split does not apply to this repository.

Render's web service filesystem is ephemeral. A restart without a disk would drop packs, approvals, and sessions. The flag must stay off in the blueprint so a deploy is not a release.

## Decision

Deploy the existing Next.js application as one Render web service, declared in `render.yaml`. Node 22. Build with `npm ci && npm run build`. Start with `npm start`. Health check `GET /api/feature-flags`, which answers before the database opens.

`FEATURE_REVIEW_READY_AD_PACK` is `false` in the blueprint. Changing it is an environment change. Render restarts the existing build to inject variables. That restart is not a new application build. The process still reads the flag on each request.

SQLite stays the system of record. `ADVERITY_DB` is `/var/data/adverity.sqlite` on a Render persistent disk mounted at `/var/data`. One disk means one instance. Do not scale this service horizontally. Secrets (`ADVERITY_PILOT_PASSPHRASE`, `ADVERITY_ORIGIN`, `MODEL_ENDPOINT`, `MODEL_API_KEY`, `MODEL_ID`) are dashboard values and are not committed.

The revised master prompt's Search CSV and Performance Max text pack are implemented beside this host decision. This ADR covers only where the process runs.

## Consequences

- Positive: one host, one process, the approval record survives a restart, and the flag still defaults off.
- Negative / trade-offs: the service cannot scale out while the disk is attached. A free Render instance cannot mount this disk, so the plan is starter. A Render env change restarts the process even though the application does not need a rebuild.
- Alternatives considered: keep "no host recorded" — rejected because the runtime decision is Render. Move the store to Render Postgres in this change — rejected because ADR 004 already chose SQLite for one process, and a disk preserves that decision. Hostinger or Hetzner — rejected for this project; those names were a skill default, not an AdVerity decision.
