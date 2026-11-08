# Production environment

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

The runtime is a Render web service named `adverity`, declared in `render.yaml` at the repository root. Render runs Node 22, builds with `npm ci && npm run build`, and starts with `npm start`. The health check is `GET /api/feature-flags`.

| Item | Value |
|---|---|
| Host | Render web service `adverity` |
| Process | The Render service process. One instance, because the disk attaches to one instance |
| Database | `/var/data/adverity.sqlite` on the persistent disk mounted at `/var/data` |
| Public URL | The Render service URL, stored as `ADVERITY_ORIGIN` in the dashboard. It is not committed |

The blueprint sets `FEATURE_REVIEW_READY_AD_PACK` to `false`. A flag change restarts the existing build so Render can inject the variable. It does not require a new application build. ADR 007.

| Flag | Default | Where it is read |
|---|---|---|
| `FEATURE_REVIEW_READY_AD_PACK` | off, unless the value is exactly `true` | server environment, each request |

The flag is not a `NEXT_PUBLIC_` variable. Procedure: [review-ready-ad-pack-devsecops-playbook.md](./review-ready-ad-pack-devsecops-playbook.md).
