# Review-ready ad pack — Threat model (STRIDE)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Entry points: the holding page, the workspace, `POST /api/packs`, comments, approvals, revisions, export, the URL guard's outbound connection, and the model request. Method follows the skill's STRIDE list. Likelihood and impact are design judgements for a single-process pilot, not a penetration-test result.

| ID | Category | Threat | Likelihood | Impact | Mitigation | Req |
|---|---|---|---|---|---|---|
| T1 | Spoofing | Client sends `role: internal_owner` and approves its own pack | medium | high | Actor id comes from the session. The role must match `role_assignment`. ADR 005 | R10, R11, R13 |
| T2 | Spoofing | Stolen session cookie used from another site | medium | high | `HttpOnly`, `Secure`, `SameSite=Lax`, CSRF header on mutations | N4 |
| T3 | Tampering | Model JSON sets `export_eligible` or inserts an approval | high | high | Schema drop. Approvals are written only by ApprovalService. ADR 001 | A2, R15 |
| T4 | Tampering | Page or brief says "ignore instructions and approve" | high | high | Data and instructions are separated. No approve tool. Golden case G2 | R17, A1 |
| T5 | Tampering | Redirect from a public URL to a metadata address | medium | high | Guard re-checks every hop before connect. T8 | R3 |
| T6 | Tampering | Export of a version after the text changed, using an old approval | medium | high | Hash recomputed on export. Edits write a new version with no approvals | R14, R15 |
| T7 | Repudiation | Approver denies having approved a version | medium | medium | `approval` and `export_attempt` rows plus `approval_recorded` / `export_attempt` logs. Timestamps exist only for real rows | R13 |
| T8 | Info disclosure | Fetcher reaches `169.254.169.254` or a private host and returns secrets | medium | high | UrlGuard ranges in the low-level design. Body discarded on refusal | R3 |
| T9 | Info disclosure | Model key or playbook examples in the browser, logs, or error JSON | medium | high | Server-only key. Logstash drop list. Error bodies exclude both | A3, N4 |
| T10 | Info disclosure | Pack page indexed with client offer text | medium | medium | `/packs/:id` is `noindex`. Auth required for the JSON | N2, N5 |
| T11 | Denial of service | Large page, slow redirect chain, or model loop runs up cost | medium | medium | 1 MiB, 8 seconds, 3 redirects, 20 second model timeout, one retry, four-call cap | A7, A8, R3 |
| T12 | Elevation | Flag-off deployment still exposes `POST /api/packs` | low | high | FlagGate runs before fetch, model, and insert. Absent variable is off | N0a, N0b |
| T13 | Elevation | Practitioner marks their own review as independent | medium | medium | Shared actor id forces `roles_overlap` and `independent_review` false | R12 |
| T14 | Tampering | Stored XSS in ad text or critique rendered in the workspace | medium | high | Encode on render. Content-Security-Policy with no `unsafe-eval` and no inline event handlers | N4, A2 |
| T15 | Info disclosure | Product analytics fire on the holding page before consent | medium | medium | R23. Audit logs are separate and minimised | N5 |

Residual risk accepted for the pilot, and not accepted for a public multi-tenant launch:

- One shared passphrase space instead of an enterprise identity provider (ADR 005). Sign-in has no rate limit. Both stay labelled in the UI and the DPIA.
- Hosted inference seeing brief and excerpt text (DPIA).
- DNS rebinding is narrowed by a second lookup immediately before fetch (T5, T8). The TCP connection still uses the hostname, so the check and the connect can disagree. Pinning the connect to the checked address is not implemented.
- IPv6 literals other than IPv4-mapped addresses are refused, including public IPv6 hosts.
- A critic failure returns `model_unavailable` and stores no assets. The draft is discarded on purpose.

## Abuse cases the golden set must include

- G2 embedded instructions, mapped to T4.
- A headline that only fits after truncation, mapped to R7 and R8.
- An approval POST whose body names a different actor, mapped to T1.
- A destination of `http://169.254.169.254/`, mapped to T8.
