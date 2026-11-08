# Review-ready ad pack — DevSecOps Playbook

> **Audience:** the engineer operating the AdVerity pilot.
> **Stack:** one Node process running Next.js. Staging and production hosts are not provisioned in this repository. The skill's target split is Hetzner for staging and Hostinger for production; use those names only after the hosts exist.
> **Feature:** review-ready Google Search ad pack (`FEATURE_REVIEW_READY_AD_PACK`, default **off**).
> **Companion docs:** [`../features/review-ready-ad-pack/`](../features/review-ready-ad-pack/) · [`production-environment.md`](./production-environment.md) · [`../features/review-ready-ad-pack/release-notes.md`](../features/review-ready-ad-pack/release-notes.md)
>
> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai.

Each play has a goal, commands, and a verify step. If verify fails, stop.

## 0 — What this feature does

Flag off: holding page, `POST /api/packs` is 404, no fetch, no model call, no pack row.

Flag on: a signed-in practitioner can generate one pack. Export stays closed until the copy expert and the route approver have approved that content hash, and any design-partner or alpha line has been confirmed.

## 1 — Ownership

| Concern | Owner |
|---|---|
| Flag flip | Basava Rajendra Alapaty |
| Model key and passphrase | The engineer on duty, with Oleksandr Velykyi for the control review |
| Playbook wording | Fiodor Klemiato |
| Evidence and claim boundaries | Nene, with the copy expert |

## 2 — Prerequisites

| Tool | Why |
|---|---|
| Node 22 or newer | `node:sqlite` and the Next.js server |
| The server environment, not a committed file | Passphrase, model key, database path |
| HTTPS in production | The session cookie is `Secure` when `NODE_ENV=production` |

## 3 — Secrets and env

| Variable | Where | Notes |
|---|---|---|
| `FEATURE_REVIEW_READY_AD_PACK` | Server env | Exactly `true` enables. Anything else is off. Not `NEXT_PUBLIC_`. |
| `ADVERITY_PILOT_PASSPHRASE` | Server env | Seeds the five pilot users on an empty database. |
| `ADVERITY_DB` | Server env | SQLite file. Not in git. |
| `MODEL_ENDPOINT`, `MODEL_API_KEY`, `MODEL_ID` | Server env | Used when `MODEL_ADAPTER` is not `fixture`. |
| `MODEL_ADAPTER` | Server env | `fixture` for a local deterministic run. |
| `EVIDENCE_MODE` | Server env | `fixture` skips the network for `healthcrew.ai` after the URL guard. |
| `ADVERITY_ORIGIN` | Server env | Canonical origin for metadata. |
| `ADVERITY_PACK_RATE_LIMIT` | Server env | Pack creates per actor per hour. Default 30. |

## 4 — Play: enable staging

Goal: the flag is on for the staging process only.

Commands: set `FEATURE_REVIEW_READY_AD_PACK=true` in the staging process environment, with a unique passphrase and a database path on that machine. Reload the process if the host injects variables only at start.

Verify:

```bash
curl -sS "$STAGING_ORIGIN/api/feature-flags"
```

Expect `{ "review_ready_ad_pack": true }`. Sign in and generate the illustrative pack. Export stays closed before the two approvals.

## 5 — Play: enable production

Goal: the same flag, on the production process, after staging verify passed.

Commands: set the variable on the production host. Do not copy the staging database. Use a new passphrase.

Verify: the same curl against the production origin, then a holding-page check that the wordmark and the three questions render. Confirm the session cookie has `Secure` on HTTPS.

## 6 — Play: day-2

- Rotate `ADVERITY_PILOT_PASSPHRASE` by replacing the environment value and creating a new database, or by updating `actor.passphrase_hash` with a new scrypt hash. Existing sessions expire after 12 hours.
- Rotate `MODEL_API_KEY` at the provider, then update the server env. No client rebuild.
- Review playbook records in `src/domain/playbook.ts` before changing prohibited claims. A playbook change should be a new version id so old packs keep the id they used.
- Back up `ADVERITY_DB` with the process stopped, or use SQLite's online backup. The file holds briefs and approvals.

## 7 — Verify checklist

- `GET /api/feature-flags` matches the intended boolean.
- Flag off: `POST /api/packs` returns 404.
- Flag on: the holding page is replaced by the signed-in workspace for a pilot user, and an anonymous visitor sees the sign-in link.
- A metadata URL such as `http://169.254.169.254/` does not produce an excerpt.
- Export of an unapproved pack returns 409.
- Response headers include `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

## 8 — Incident playbooks

| Symptom | Look here | Threat |
|---|---|---|
| Export succeeded for a pack that failed the character check | `export_attempt` rows and the `export_attempt` log. Turn the flag off. | R15 |
| The fetcher touched a private or metadata address | `url_refused` should have fired first. If a body was stored, turn the flag off and delete that pack. | T5, T8 |
| A pack shows an approval nobody made | `approval` rows. Actor id must match a session. Turn the flag off if the actor id is missing. | T1, T7 |
| Model cost spikes | `model_calls` on `pack_version`. The cap is 4. A higher number is a defect. | A8, T11 |
| Ad text appears in logs | Logstash or the process log. The application logger is supposed to send ids only. Turn the flag off and purge the log line. | T9 |

## 9 — Rollback

Set `FEATURE_REVIEW_READY_AD_PACK` to `false` or unset it. Reload the process only if the host requires it. Verify the flag endpoint and that `POST /api/packs` is 404.

The SQLite file can stay. Flag off does not read it for the holding page. Do not delete it as part of the kill switch; it is the approval record.

A code rollback is a revert of the merge and a redeploy. The schema is additive. An older build that does not know the tables will not open the workspace while the flag is off.

## 10 — Security and compliance

- T1–T15 in `docs/features/review-ready-ad-pack/threat-model.md`.
- DPIA is a draft. Do not enable the flag for anyone beyond the named operators until privacy review.
- No product-analytics call runs before the consent row.
- The model key never uses a `NEXT_PUBLIC_` name.

## 11 — Related docs

- Feature pack: `docs/features/review-ready-ad-pack/`
- Release notes: `docs/features/review-ready-ad-pack/release-notes.md`
- Feature reel: not recorded. Stage 14 waits on a release decision.
