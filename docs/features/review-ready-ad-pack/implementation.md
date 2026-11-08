# Review-ready ad pack — Implementation

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## What landed

A Next.js application reads `FEATURE_REVIEW_READY_AD_PACK` on each request. Off, it serves the holding page. On, a practitioner can generate one Search ad pack. The pipeline guards the URL, stores an excerpt, calls the model adapter for a draft, a critique, and at most one repair, then counts characters in application code. SQLite stores versions and approvals. Export is recomputed from the content hash.

The fixture adapter (`MODEL_ADAPTER=fixture`) is the deterministic path used by tests and local review. It is not a claim about a hosted model's quality. A hosted call uses `src/adapters/http-model.ts` and a server-side key.

## Source map

| Concern | Path |
|---|---|
| Flag | `src/domain/flag.ts` |
| URL guard and fetch | `src/domain/url-guard.ts`, `src/evidence/fetch.ts` |
| Character counter and claim scan | `src/domain/google-count.ts`, `src/domain/claims.ts` |
| Pipeline | `src/domain/pipeline.ts` |
| Approvals and export | `src/domain/approval.ts`, `src/server/service.ts` |
| HTTP | `src/server/http.ts`, `app/api/[...path]/route.ts` |
| Workspace | `app/page.tsx`, `app/packs/[id]/page.tsx` |
| Tests | `src/**/*.test.ts`, `tests/integration/packs.test.ts`, `tests/e2e/` |

## Tests

Unit and integration tests cover the flag, the URL guard, the ASCII fixtures from the brief, approval order, overlap, comment versus edit, and the refusal of a metadata URL. Playwright covers the holding page and the freelance approval journey. Coverage on the domain, database, and server code is 86.8% statements, 77.1% branches, 97.2% functions, and 94.5% lines.

Stryker, on 8 November 2026, scored the domain modules at 52.43% (401 killed, 41 timed out, 335 survived, 66 with no coverage). Approval logic scored 70.5%. The flag scored 100%. Many survivors are alternate strings in the playbook and in log messages. The break threshold is set at 50 so a later run that falls below this first measurement fails. That score predates the later URL-guard, export-assignment, and session-deletion changes. It has not been re-run.

## Known limits

The character counter follows the rules in the low-level design and the ASCII fixtures. It still needs a check against Google's current counting documentation before a production enablement. Pilot sign-in is a shared passphrase and five usernames, with no sign-in rate limit. Export requires a role assignment on the pack. Sign-out deletes the session row. The second DNS lookup refuses a private answer before fetch; the connection still uses the hostname, so a rebinding window remains. Hosts for staging and production are not provisioned in this repository. Coverage figures above are from the run before those security edits.
