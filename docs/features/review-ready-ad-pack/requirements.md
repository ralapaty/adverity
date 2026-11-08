# Review-ready ad pack — Requirements (EARS)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

Freelance user-acquisition managers and freelance Google Ads subject-matter experts need a review-ready Search ad pack for a client. In-house Google Ads subject-matter experts need the same pack for their own product, with an internal owner as approver. SME in this feature means subject-matter expert.

The practitioner submits a product URL, a short brief, and search-intent context. AdVerity stores public-page evidence, drafts a responsive search ad, records a critique and a revision, and checks character limits in application code. A copy expert refines the exact version. An external client (freelance route) or an authorised internal business owner (in-house route) approves that same version. Export stays closed until those gates pass. The feature does not publish ads and does not spend budget.

The worked HealthCrew.ai input is an illustration: UK English drafts for healthcare staffing-agency owners exploring recruitment technology, ad group "healthcare recruitment software", commercial-evaluation intent, technology platform rather than a staffing agency. It is not evidence that those roles, approvals, or a customer contract exist.

## Success metric

| Field | Value |
|---|---|
| Primary metric | Median `time_to_first_validated_draft_ms`: wall-clock from pack submit to the first version that passes the deterministic validator |
| Baseline | Unmeasured. There is no production workflow. Interview notes may later record a manual baseline. This document does not invent one |
| Target | Median at or under 5 minutes on the illustrative en-GB HealthCrew brief, in a pilot session, after the flag is on |
| Guardrails | Zero exports of a version that failed validation or lacks the required approvals. Zero safety failures on the golden set. Private and metadata URLs refused in every fixture. A comment leaves approvals in place. An ad-text, offer, locale, or destination edit clears both approvals. Product analytics do not fire before consent |
| Instrumentation | Server event `ad_pack_validated` with `pack_id`, `version_id`, `elapsed_ms`, `validator_pass`. Consent-gated. The event is not a CTR, conversion, or ROAS measure |
| Method after rollout | Before/after on pilot sessions. An A/B split is a later choice once more than one practitioner is active |

Strategy hypotheses in the brief (time lost to revisions, sign-off bottlenecks, project versus recurring purchase, willingness to pay) stay outside this metric. They are not acceptance criteria.

## Functional requirements

- R1. When a practitioner submits a product URL, brief, advertiser, user type, objective, audience, keyword or ad-group context, target market, and locale, the Ad Pack service shall create a pack in status `draft` and shall withhold publication-ready and export-eligible status.
- R2. When a pack is created, the Evidence Fetcher shall retrieve the public page, store excerpts with evidence IDs, and label each excerpt as a website assertion, a user claim, a confirmed fact, an assumption, or an unknown.
- R3. If the product URL, any redirect, or any resolved address is not public HTTP or HTTPS, or is a private, loopback, link-local, multicast, or metadata address, then the Evidence Fetcher shall refuse the fetch, store no response body, and set the pack to `needs_input`.
- R4. The Playbook service shall attach one immutable playbook version (approved terminology, reviewed examples, prohibited claims, messaging patterns, and locale rules) and shall pass selected records to the model as data. The system shall not train or fine-tune a model during this feature.
- R5. When evidence and a playbook version are present, the pipeline shall request a responsive search ad of 15 headlines and 4 descriptions. Each asset shall carry an angle (`benefit_led`, `distinctive_clear`, or `problem_aware`), evidence IDs, and flags. If a complete set cannot be grounded, the service shall return the assets it can support and mark the pack `incomplete`.
- R6. When a draft exists, the critic step shall record a concise before / issue / after entry for each challenged asset, covering evidence, intent, diversity, localisation, and landing-page match. The service shall not store model agreement as verification or as approval.
- R7. When the critic challenges an asset, the revise step shall produce a replacement and shall run at most one bounded repair. The service shall not silently truncate text to meet a character limit.
- R8. The validator shall set `google_count` from the counting rules in the low-level design. A headline passes only at 30 or fewer. A description passes only at 90 or fewer. On failure the preview shall remain visibly a draft, and approved export shall stay blocked.
- R9. The service shall map each supplied keyword theme to an ad-group intent, mark the intent as inferred, and mark the theme as unresearched unless a separate research record is stored. The service shall not present themes as search volume or performance results.
- R10. While a version has no copy-expert approval, the service shall reject a client or internal-owner approval for that version.
- R11. Where `user_type` is `freelance`, the service shall accept final approval only from an assigned external client approver. Where `user_type` is `in_house`, the service shall accept final approval only from an assigned internal product, brand, or business owner.
- R12. If one actor is assigned as both practitioner and copy expert, then the service shall store `roles_overlap` true and shall reject any representation of that review as independent.
- R13. If the route's final approver is unassigned, then the service shall keep the pack pending and shall not write an approval, a timestamp, or an approver name.
- R14. When ad text, offer, locale, or destination changes, the service shall write a new immutable version and clear copy-expert and route-approver approvals. A comment shall not create a version and shall not clear approvals.
- R15. The service shall emit a review-pack export only when validation passed, required language review is satisfied, and both approvals refer to that exact version. The export shall be labelled as a human-review extract. The service shall not label it Google Ads Editor-compatible.
- R16. The service shall not publish a campaign and shall not authorise ad spend.
- R17. If fetched page text or brief text contains instructions, the pipeline shall treat that text as untrusted data and shall not follow those instructions.
- R18. If availability, market eligibility, destination, or the contact offer is unconfirmed, or a claim would assert a guaranteed outcome, a saving, an unverified metric, a placeholder testimonial, or a certification, then the service shall exclude the claim and return `needs_input` for the missing confirmation.
- R19. Where the assigned copy expert cannot assess the pack locale, the service shall require a qualified language-review approval on the same version before export becomes eligible.
- R20. Where the pack advertiser is the illustrative HealthCrew.ai example, the service shall keep technology-platform positioning, shall exclude agency-staffing offers, and shall keep job-seeker messaging out of the commercial-evaluation ad group.
- R21. The service shall store and return the AdVerity user, the advertiser, the target ad audience, and the final approver as distinct fields.
- R22. When the service returns a pack, the body shall include `status`, `user_type`, `advertiser`, `audience`, `approver_route`, `evidence`, `assumptions`, `intent_map`, `playbook_version`, `market_packs`, `critique_log`, and `limitations`. Each asset shall include `text`, `angle`, `evidence_ids`, `flags`, and `google_count` or null.
- R23. The service shall not emit product-analytics events until consent is recorded. Security audit events shall still be written, with the minimised fields in the observability note, without that consent.

## Non-functional requirements

- N0a. The feature shall be gated by `FEATURE_REVIEW_READY_AD_PACK`, defaulted off. Enabling or disabling it shall be a server-environment change read on the next request, without a deploy. Any value other than `true` shall leave the feature off.
- N0b. While the flag is off, the service shall serve the holding page and shall not fetch URLs, call the model, or persist packs. The change shall keep the existing test suite green and shall be backward-compatible for data and APIs. This repository has no prior suite; the flag-off tests are the regression baseline.
- N1. The holding page and the workspace shall meet Core Web Vitals at p75: LCP under 2.5s, INP under 200ms, CLS under 0.1.
- N2. Each shipped page shall have a unique title and description, a canonical URL, Open Graph and Twitter metadata, semantic headings, text alternatives for informational images, and valid schema.org JSON-LD. Sitemap and robots shall be updated when the page is indexable.
- N3. The holding page shall include a concise factual answer of what AdVerity does, plus FAQPage JSON-LD, so an answer engine can cite it without inferring unpublished pricing, performance, or customers.
- N4. The service shall apply the OWASP Top 10 controls in the threat model: input validation, output encoding, server-side authorisation, CSRF protection on mutations, a Content-Security-Policy and companion security headers, no secrets in the client, and a clean dependency audit before enablement.
- N5. The service shall minimise personal data, document retention in the DPIA, support export and deletion of a practitioner's pack data, and keep product analytics off until consent.
- N6. The changed UI shall meet WCAG 2.1 AA, including keyboard use, visible focus, form labels, status messages that are announced, and contrast for the teal and coral interface once those tokens are supplied.

## AI requirements

- A1. The model adapter shall place system instructions outside user and page content, and shall not grant the model a tool that approves, exports, fetches an arbitrary URL, or spends.
- A2. The service shall parse model output against the pack schema and shall reject non-conforming output. It shall not evaluate or execute model text.
- A3. The service shall keep API keys, the system prompt's private playbook examples, and raw secrets out of client responses and logs.
- A4. A model failure, timeout, or schema rejection shall set status `model_unavailable` or `needs_input` and shall not fill the pack with invented assets.
- A5. Each version shall record the adapter id and model id that produced it. Hosted inference shall be described as hosted. The copy shall not call a candidate model, including Qwen, a proven advertising benchmark winner.
- A6. The golden set under `evals/golden-set.md` shall be the AI regression suite. Safety failures allowed: zero. Deterministic validator agreement on the ASCII fixtures: 100 percent. Schema-valid mocked adapter responses: 100 percent. A passing eval shall not write an approval.
- A7. Each model call shall time out at 20 seconds, with one retry and backoff. End-to-end model time for draft, critic, and revise shall have a design budget of 45 seconds at p95. Past the budget, A4 applies.
- A8. One version shall make at most three model calls plus one bounded repair call. The observability note shall alert when a version exceeds that cap.
- A9. Unit and integration tests shall mock the adapter and assert schema, guardrail, and tool-boundary behaviour. Live model runs belong to the eval suite.
- A10. Where the provider supports it, eval calls shall pin temperature and seed. Creative wording may vary. Safety, schema, counts, and approval effects may not.

## Holding-page and workspace copy constraints

The flag-off page states the product name and the line "AI drafts. Copy experts refine. Clients approve." It does not offer generation. The flag-on primary action is "Generate a review-ready ad pack." Neither page claims that generic generation, localisation, or character checks are unique, and neither page states a price, a CTR, a ROAS, or a paying-customer relationship.

## Out of scope

- Grona campaign setup, targeting, and delivery. An AdVerity promotion campaign stays separate from any customer example pack.
- Google Ads publishing, spend, and an Editor-compatible import claim.
- Bulk campaigns, automated multi-market orchestration, and a second locale without a qualified reviewer.
- Model training, retrieval presented as fine-tuning, and local-only claims about hosted inference.
- Pricing, packaging sale, and willingness-to-pay claims.
- Production single sign-on. MVP session authentication is a server-side session, not a client role switch, and is not an enterprise identity provider.
- Performance prediction.
- Legal certification, platform policy approval, or a fresh audit presented as already done.
- Interviews as a software deliverable. They remain a human research task.

## Traceability

Tests are planned for after design sign-off. None of these files exist yet.

| Req | Planned test |
|---|---|
| R1, R21, R22 | integration: pack create returns draft JSON with distinct parties |
| R2, R18, R20 | integration: evidence labels; prohibited claim excluded; HealthCrew fixture positioning |
| R3, A1 | unit: URL guard; eval: instruction text in a page does not approve |
| R4, A5 | unit: playbook version pinned; no training call on the adapter port |
| R5, R6, R7, A2, A4, A9 | unit: mocked adapter schema; incomplete pack; no silent truncation; one repair |
| R8, A6 | unit: Google-count fixtures, including the brief's ASCII headline and description counts |
| R9 | unit: themes stored as unresearched inferences |
| R10–R16, R19 | unit: approval state machine; integration: export allowed and refused |
| R12, R13 | unit: overlap flag; missing approver writes no approval row |
| R14, R23 | unit: comment versus edit; analytics suppressed before consent |
| R17 | eval golden case: embedded instructions |
| N0a, N0b | unit + e2e: flag absent and flag off leave fetch, model, and database unused |
| N1–N3, N6 | e2e: holding page and workspace metadata, headings, and keyboard path |
| N4, N5 | integration: CSRF, security headers, secret absence; DPIA retention cases |
| A7, A8 | unit: timeout and call-cap behaviour on the mocked clock |

## Illustrative count fixtures

These counts are for the exact ASCII strings in the 8 November 2026 brief. They pin the counter. They are not a hardcoded production pack.

| Text | Kind | Count |
|---|---|---:|
| HealthCrew AI | headline | 13 |
| Healthcare Hiring Software | headline | 26 |
| Tools for Staffing Agencies | headline | 27 |
| Become a Design Partner | headline | 23 |
| Explore HealthCrew AI, a healthcare technology platform for recruitment teams. | description | 78 |
| An alpha-stage platform for healthcare hiring. Ask about becoming a design partner. | description | 83 |
| Healthcare recruitment technology for care providers and staffing agencies. | description | 75 |
| Help shape healthcare recruitment tools. Contact HealthCrew AI to discuss your needs. | description | 85 |

Critic fixture, not an approved asset: "Hire Verified Nurses in 72 Hrs." The expected issue is an implied verification and a hiring outcome that the illustration has not substantiated, plus a blur between software and a staffing service. The expected revision direction is a platform description such as "Healthcare Hiring Platform", with expert review and both approvals left pending.
