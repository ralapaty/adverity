# Review-ready ad pack — Runbook

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Short card. The operator procedure is [../../ops/review-ready-ad-pack-devsecops-playbook.md](../../ops/review-ready-ad-pack-devsecops-playbook.md).

- Kill switch: set `FEATURE_REVIEW_READY_AD_PACK` to anything other than `true`. No rebuild. The flag is not a `NEXT_PUBLIC_` variable.
- Check: `GET /api/feature-flags` returns `{ "review_ready_ad_pack": false }`.
- Holding page has no **Generate a review-ready ad pack** control.
- `POST /api/packs` returns 404 and writes no pack.
- Host: the Render service in `render.yaml`. One instance. Disk mount `/var/data`.
- Local image: `docker compose up` from the repository root. The compose file also leaves the flag off and mounts `/var/data`. It does not set the passphrase.
- Database file: `ADVERITY_DB`, which is `/var/data/adverity.sqlite` on Render. Do not commit it.
- Model key: `MODEL_API_KEY` on the server only.
