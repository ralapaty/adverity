# OWASP and GDPR baseline — Kickoff

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Updated 8 November 2026. Branch `feat/owasp-gdpr-baseline`.

## Context

AdVerity already keeps approvals in application code, blocks private URL fetches, sets a nonce Content-Security-Policy, and records product metrics only after consent. The DPIA is still a draft. Sign-in is not rate-limited. A person cannot withdraw consent, export their packs, or delete them. Retention is a proposal, not a job. This feature closes those gaps. It does not certify the product, complete a legal review, or turn the review-pack flag on.

## Definition of Ready

- Scope is the controls in `requirements.md`. DNS pinning and a completed DPIA stay out.
- Zoho Projects is not connected. Task tracking is skipped. Vaiz is not used.
- The product flag `FEATURE_REVIEW_READY_AD_PACK` stays default off.
- Security controls in this feature are proposed to run whenever the process runs, because leaving them dark would keep the holes open. That waiver of dark launch needs the design sign-off.

## Success metric

Count of sign-in attempts refused after the limit, and a deletion that leaves no pack row for that actor. Baseline today: sign-in attempts are not limited, and deletion is not available.
