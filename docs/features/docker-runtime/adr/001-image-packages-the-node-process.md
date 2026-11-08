# ADR 001 — The image packages the existing Node process

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Date: 2026-11-08. Status: accepted.

## Context

Render already builds this repository with `npm ci && npm run build` and starts `npm start` (ADR 007). Operators also need a portable run of the same process. A second product flag for "Docker" would not hide user behaviour: the image either runs or it does not. The product flag already decides whether the workspace opens.

`node:sqlite` is a Node built-in. This machine is Node 26, where the import works with no flag. The image is pinned to Node 22 so it matches Render. Node 22 may still require `--experimental-sqlite`.

## Decision

Add a multi-stage Dockerfile and a compose file. The runtime stage copies the Next.js standalone output, runs as a non-root user, and defaults the product flag to false. `next.config.ts` sets `output: "standalone"`. `next start` remains valid for Render.

Do not change `render.yaml` to a Docker runtime in this change. Do not add a new feature flag.

The container listens on all interfaces. The SQLite file stays at `/var/data/adverity.sqlite` on a volume the operator mounts. Secrets are run-time environment only.

## Consequences

- Positive: one image matches the process Render already runs, and a restart keeps the database when the volume is mounted.
- Negative: the image is larger than a scratch build, and Node 22 may need the experimental sqlite flag. Without a mounted volume, a container restart drops packs. The Docker daemon is not running here, so the first proof is a build once the daemon is available.
- Alternatives considered: switch Render to Docker now — rejected so the accepted blueprint keeps working. Use Postgres in the image — rejected because ADR 004 chose one SQLite file. Run as root — rejected.
