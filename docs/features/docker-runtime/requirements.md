# Docker runtime — Requirements

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

These requirements package the existing process. They do not change the review pack, the OWASP baseline, or the Render blueprint.

- R1. The repository shall contain a Dockerfile that builds from `node:22-bookworm-slim` with `npm ci` and `npm run build`, then runs the Next.js standalone server as a non-root user.
- R2. The process inside the container shall listen on `0.0.0.0` and on `PORT`, defaulting to 3000.
- R3. The image shall set `NODE_ENV=production`, `FEATURE_REVIEW_READY_AD_PACK=false`, and `ADVERITY_DB=/var/data/adverity.sqlite`. An operator may override the flag at run time. The image shall not contain a passphrase, a model key, or a `.env` file.
- R4. If that Node 22 image still requires it, the start command shall set `NODE_OPTIONS=--experimental-sqlite` so `node:sqlite` loads. The smoke check shall import `node:sqlite` before the server is treated as healthy.
- R5. A Docker healthcheck shall request `GET /api/feature-flags` on localhost and succeed when the body says the review pack is off. The check shall not require the SQLite file to exist first.
- R6. `docker-compose.yml` shall publish port 3000, mount a named volume at `/var/data`, and leave the product flag off. It shall not set `ADVERITY_PILOT_PASSPHRASE`, `MODEL_API_KEY`, or `MODEL_ENDPOINT`.
- R7. `.dockerignore` shall exclude `.env`, `.env.*`, `data`, `node_modules`, `.next`, coverage, and git metadata.
- R8. While the container runs with the default environment, the holding page and the closed product API shall match the current flag-off behaviour. Sign-in stays available. Render's `render.yaml` shall stay a Node service.
- R9. The change shall keep the existing test suite green.
- R10. The docs shall not say the image has been deployed, scanned by a registry, or certified.

## Out of scope

Replacing Render. Horizontal scale. Postgres. A private registry. Baking the pilot passphrase into the image.
