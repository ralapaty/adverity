# Review-ready ad pack — Low-Level Design

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Diagrams: `c4-component.puml`, `sequence-main.puml`, `sequence-errors.puml`, `state-approval.puml`, `er.puml`.

## Components

| Component | Responsibility |
|---|---|
| FlagGate | Reads `FEATURE_REVIEW_READY_AD_PACK` per request. Proceeds only when the value is `true` |
| PackRoutes | Session, CSRF header, schema validation, and HTTP mapping |
| Pipeline | Orders evidence, playbook, draft, critic, repair, and validation |
| UrlGuard | Scheme, DNS, redirects, size, and time |
| PlaybookStore | One immutable playbook version. Records are data |
| ModelAdapter | `draft`, `criticise`, `repair`. No other tools |
| GoogleCounter | Deterministic counts. Does not rewrite text |
| ApprovalService | Hash binding, overlap, language review, export eligibility |
| AuditLog | Minimised JSON events |

## Session and CSRF

Sign-in exchanges a passphrase for a session id stored server-side. The cookie is `HttpOnly`, `Secure` only when `NODE_ENV` is `production`, and `SameSite=Lax`. Mutations require the cookie and a matching CSRF token, sent as `X-AdVerity-CSRF` or as a `csrf` form field. An empty or invalid JSON body does not throw; the header still supplies the token. `POST /api/sign-out` and `DELETE /api/session` delete the session row and clear the cookie. Role checks use `role_assignment` for the pack. The actor id on an approval row is the session actor, not a body field.

The passphrase is verified with a slow hash. The plaintext is not stored and not logged.

## URL guard

1. Parse the URL. Allow only `http` and `https`. Reject missing hosts, credentials in the URL, and non-default schemes.
2. Resolve the host. Reject empty answers.
3. Reject addresses in these ranges, and the cloud metadata hostnames commonly used for link-local services: loopback, `0.0.0.0/8`, `10.0.0.0/8`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10`, multicast, reserved, and IPv4-mapped IPv6 forms of those ranges. Reject `169.254.169.254` explicitly. Every other IPv6 literal is refused. That includes public IPv6 hosts: the pilot fails closed rather than classifying unique-local, link-local, and documentation ranges by hand.
4. Resolve the hostname again immediately before the fetch. If that lookup fails or returns a non-public address, discard the body and do not call the HTTP client. The connection itself still uses the hostname, so a DNS answer can change between this check and the connect. That remaining rebinding window is accepted for the pilot and is not closed.
5. Follow at most three redirects. Run steps 1–4 on every hop before connecting. A redirect to a refused address fails the fetch.
6. Time out the connection at 8 seconds. Read at most 1 MiB of body. Do not execute scripts, follow meta refreshes, or load subresources.
7. Extract visible text. Persist an excerpt and its hash, labelled `website_assertion`, or refuse and persist nothing when the guard fails.

The guard is used for the product URL and for any destination URL stored on the pack. The model cannot supply a URL to this component.

## Playbook and model request

The data section contains: evidence excerpts and IDs, the brief, advertiser, audience, locale, keyword themes, and the selected playbook records. The instruction section is the AdVerity task (grounding, intent, creative limits, output schema). The instruction section tells the model that data is not instructions.

The adapter sends that request to the configured endpoint with the server-side key. It waits 20 seconds, retries once with backoff, and then returns `model_unavailable`. The response must match the asset schema. Extra fields are dropped. A response that includes an approval, an export flag, or a tool call is a schema failure.

Draft, critic, and one repair are the only calls for a version. Repair receives the critic entries and the same evidence IDs. It may not add a claim that has no evidence ID.

## Google counter

Design rule, to be checked against Google's current Ads documentation before production enablement:

- Walk Unicode code points, not UTF-16 code units and not UTF-8 bytes.
- A code point whose East Asian Width is `W` or `F`, and an emoji code point, counts as 2.
- Every other code point counts as 1.
- Do not trim, normalise, or substitute before counting. The stored text is the counted text.
- Headline limit 30. Description limit 90.
- `google_count` is null when the asset was not counted. A null count fails validation.

The ASCII fixtures in `requirements.md` count as one per character. Those expected totals are the unit-test oracle.

A pack passes validation when it has 15 headlines and 4 descriptions, every asset is within limit, and every asset has at least one evidence ID. Fewer grounded assets produce `incomplete` and `validation_passed` false, with the text kept in full. The service does not pad with unsupported lines.

## Content hash

`content_hash` is SHA-256 over a canonical JSON document with sorted keys: locale, destination URL, offer summary, playbook version id, and the assets in `(kind, position)` order including text, angle, and evidence IDs. Approvals store the same hash. Export recomputes the hash and refuses the download when it differs from the approved hash.

Changing ad text, offer, locale, or destination builds a new version and copies no approval rows. A comment writes `comment` only.

## Approval service

`export_eligible` is true only when:

- `validation_passed` is true
- an approval with `decision = approved`, `role = copy_expert`, and this `content_hash` exists
- an approval with `decision = approved`, the route role, and this `content_hash` exists
- if `language_review_required` is true, a `language_reviewer` approval for this hash exists
- the route role is `external_client` when `user_type` is `freelance`, and `internal_owner` when `user_type` is `in_house`

The route approval is rejected while the copy-expert approval is absent. An approval is rejected when the session actor is not assigned to that role. When practitioner and copy expert share an actor id, `roles_overlap` is true on both assignment rows, and the API sets `independent_review` false. The service never writes an approval timestamp without an approval row.

## HTTP API

| Method and path | Flag off | Flag on |
|---|---|---|
| `GET /api/feature-flags` | `{ "review_ready_ad_pack": false }` | `{ "review_ready_ad_pack": true }` |
| `POST /api/packs` | 404, no side effects | 201 draft pack |
| `GET /api/packs/:id` | 404 | pack JSON (R22) |
| `POST /api/packs/:id/comments` | 404 | comment, same version |
| `POST /api/packs/:id/assignments` | 404 | server-side role row |
| `POST /api/packs/:id/approvals` | 404 | approval or a refusal without a forged row |
| `POST /api/packs/:id/revisions` | 404 | new version, validator re-run, no model call |
| `GET /api/packs/:id/export` | 404 | CSV when the caller has a role on the pack and the version is eligible; 403 with no role assignment; 409 with the blocking reason |

A human edit re-runs the URL guard, the claim scan, and the character counter. It does not call the model, so the stored words stay the editor's words. Approvals and offer/destination confirmations are not copied onto the new version.

Error bodies use `status` of `needs_input`, `model_unavailable`, `validation_failed`, or `forbidden`. They do not include stack traces, key material, or playbook bodies.

## Review extract

CSV columns: `campaign`, `ad_group`, `locale`, `headline`, `description`, `final_url`, `review_version`. One row per headline and per description is acceptable if the header stays this set. The first line of the file is a comment that the file is a human-review extract and is not a tested Google Ads Editor import. `final_url` is the stored destination. The file is refused when that destination has not passed the URL guard.

## Workspace behaviour

The holding page (flag off) shows the product name and "AI drafts. Copy experts refine. Clients approve." It has no generate control.

The workspace (flag on) collects the R1 inputs, shows evidence labels, the intent map, assets with counts, the critique log, overlap when present, and approval state. A failed validation banner stays visible. The export control is disabled, and the API still enforces the gate, until `export_eligible` is true. Publishing and spend controls are absent.

The HealthCrew illustration, when loaded as a fixture, is captioned as an example advertiser. Design-partner and alpha wording stays flagged until a confirmation is stored (R18).

## Pages and metadata

| Path | Flag | Indexing |
|---|---|---|
| `/` | both | Indexable holding statement when off. Workspace entry when on |
| `/packs/:id` | on | `noindex`. A pack is not a public landing page |

Titles are unique. The holding page includes FAQPage JSON-LD with factual answers: what the product does, who it is for (the two practitioner groups), and that export waits for human approval. The JSON-LD does not include prices, performance lifts, or customer claims.
