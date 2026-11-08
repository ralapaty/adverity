# Review-ready ad pack — DPIA

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Status: draft for design sign-off. This is not a completed legal review. Privacy or legal sign-off is required before the flag is turned on for anyone other than the named operators.

## Why a DPIA is included

The feature sends text to a hosted model, stores reviewer identities, and can ingest public pages about healthcare recruitment. It does not make a solely automated decision that produces a legal or similar effect: export and any later publishing step stay with a person. It is not designed to process patient records or other special-category data. A proportionate DPIA is still required because web pages and briefs can contain personal data, and because a healthcare example makes accidental collection plausible.

## Processing

| Data | Source | Who it is about | Special category? |
|---|---|---|---|
| Account session and actor id | Operator sign-in | Practitioners, copy experts, approvers | No |
| Brief, advertiser name, offer | The practitioner | The advertiser, and anyone the brief names | Not sought. Possible if the brief includes it |
| Public page excerpts | The product URL | Whoever the page mentions | Not sought. Possible on a healthcare page |
| Ad text, critique, comments | Model and reviewers | Same as the brief and the page | No, when R18 is honoured |
| Approval decision and time | The assigned person | That person | No |
| Security audit logs | The service | Actor ids | No |
| Product metric `ad_pack_validated` | The service, after consent | The practitioner's pack | No |

The feature must not ask for health data, and the pipeline must not turn page text into a profile of a patient or a job seeker. Job-seeker acquisition is out of the commercial-evaluation ad group (R20).

## Purpose and lawful basis

Purpose: produce a review pack and keep an audit of who approved which version.

Proposed bases, pending legal confirmation:

- Reviewer account data and approvals: contract, or legitimate interests of the operator running the pilot, documented with a balancing test.
- Public page excerpts: legitimate interests, limited to text needed to ground claims, stopped when the guard or the practitioner marks the source inappropriate.
- Product analytics: consent, default off (R23).
- Security logs: legitimate interests in keeping the gates intact.

The illustrative HealthCrew brief is sample content supplied by the product team, not a received customer instruction, until a real brief is submitted.

## Minimisation and retention

- Store excerpts, not full-page archives, and cap the fetch at 1 MiB.
- Logs store ids and hashes, not briefs or ad text.
- Packs and approvals: keep for the pilot, default 90 days, then delete or return them on request. This period is a proposal.
- Audit logs in Elasticsearch: 30 days (observability ILM), then delete.
- Playbook examples: kept while that playbook version is referenced by a pack version, because the hash is part of the record.

## Processors

The pinned model endpoint processes briefs and excerpts. The provider is whichever already-working endpoint is configured (ADR 003). It must be named in the operator record before enablement, with the region and the data-processing terms. Elasticsearch, when hosted, is a processor for the minimised logs. Neither processor is authorised to train on pack content for this feature; the adapter does not send a training job.

## Rights

A practitioner can request a copy of their packs and deletion of those packs. Deletion removes pack, version, asset, evidence, comment, and approval rows for that actor's packs. Audit events keep a deletion marker and drop the actor id after the log window. The export CSV is one way to satisfy access for a single pack.

## Risks and residual measures

| Risk | Measure |
|---|---|
| A healthcare page contains patient or candidate personal data | Do not design the fetch around such pages. If an excerpt is obviously a person's health or recruitment record, the practitioner's path is to discard the pack. A blocklist of excerpt patterns is a follow-on, not a claim that detection is complete |
| Hosted model retains prompts | Choose the endpoint's no-training setting where the provider offers it, and record the setting. Say in the UI that inference is hosted |
| Over-claiming health outcomes in ads | R18 excludes guarantees, unverified metrics, testimonials, and certifications. Humans still approve |
| Analytics before consent | R23, tested |

Residual risk: the pilot cannot promise that a public page is free of personal data, and it cannot promise that a hosted model retains nothing. Both are disclosed to the operators before enablement. They are acceptable for a named-operator pilot only after the legal review above. They are not accepted here as a public launch decision.
