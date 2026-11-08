# Docker runtime — Low-level design

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Build

1. `deps`: `node:22-bookworm-slim`, `npm ci` from the lockfile.
2. `build`: `npm run build` with `output: "standalone"`.
3. `run`: copy `standalone`, `.next/static`, and `public`. User `node` (uid 1000) or a dedicated uid. `WORKDIR /app`.
4. Create `/var/data` and give that user ownership so the first SQLite file can be created when the flag is later turned on.
5. `CMD` runs `node server.js` after a one-line import check of `node:sqlite`. `HOSTNAME=0.0.0.0`. `PORT=3000`.

## Run

Compose service `adverity`:

- build the Dockerfile
- `ports: ["3000:3000"]`
- volume `adverity-data:/var/data`
- environment: `NODE_ENV=production`, `FEATURE_REVIEW_READY_AD_PACK=false`, `ADVERITY_DB=/var/data/adverity.sqlite`
- healthcheck: Node `fetch` of `http://127.0.0.1:3000/api/feature-flags`, expecting `review_ready_ad_pack` false

No passphrase in the file. An operator who wants the workspace passes `ADVERITY_PILOT_PASSPHRASE` and the flag at `docker compose run` time, which is outside this default file.

## Tests

- Unit: read `Dockerfile`, `.dockerignore`, and `docker-compose.yml` and assert the Node 22 base, a `USER` line, the flag default, the volume path, and the absence of `MODEL_API_KEY=` and passphrase literals.
- Integration: when `docker info` succeeds, `docker build` and a one-shot container must return the feature-flag JSON. When the daemon is down, the test skips that build and records the skip. It does not fail the suite for a missing daemon.
- End-to-end: the existing holding-page Playwright test stays green. It does not need the container.

## Observability

The process already writes JSON logs to stdout. Docker collects that stream. No new log shipper. The healthcheck is the container liveness signal and matches the Render path `/api/feature-flags`.
