# Review-ready ad pack — User guide

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## What you get

A practitioner submits a product URL, a brief, and keyword themes. AdVerity fetches the public page, drafts a Google Search ad, records a critique, and counts characters. Export stays closed until a copy expert and the route approver have signed that exact version.

Freelance packs are approved by an external client. In-house packs are approved by an internal owner. If one person is both practitioner and copy expert, the pack says the review is not independent.

HealthCrew.ai in the sample form is an illustrative advertiser. It is not a record of a paying customer.

## Turn the feature on for a local pilot

The feature is off until this variable is exactly `true`. Any other value, including an empty value, leaves the holding page in place.

```bash
export FEATURE_REVIEW_READY_AD_PACK=true
export MODEL_ADAPTER=fixture
export EVIDENCE_MODE=fixture
export ADVERITY_PILOT_PASSPHRASE='choose-a-long-passphrase'
export ADVERITY_DB=./data/adverity.sqlite
npm run dev
```

`MODEL_ADAPTER=fixture` uses a deterministic sample and does not call a hosted model. A live endpoint needs `MODEL_ADAPTER` unset, plus `MODEL_ENDPOINT`, `MODEL_API_KEY`, and `MODEL_ID` on the server. Those values are not put in the browser.

Sign in with one of the pilot usernames and the shared passphrase: `practitioner`, `copy-expert`, `external-client`, `internal-owner`, `language-reviewer`. This sign-in is a pilot mechanism, not an enterprise identity provider.

## Review a pack

1. Sign in as `practitioner` and choose **Generate a review-ready ad pack**.
2. Read the evidence label, the intent map, the character counts, and the critique. Lines about a design-partner or alpha offer stay flagged until the route approver confirms them.
3. Assign the copy expert and the route approver by username.
4. Sign in as the copy expert and approve the version.
5. Sign in as the client or internal owner, confirm the destination and the offer, and approve the same version.
6. Download stays closed until the handoff checks pass. A Search file carries the note “Import has not been tested.” A Performance Max file is a text handoff, not a Search import.

A comment stays on the version and does not approve it. Editing ad text, the offer, the locale, or the destination starts a new version and clears both approvals.

Publishing a campaign and spending a budget are not actions in this product.

## Product metrics

The holding page and the workspace do not load third-party analytics. **Record consent for product metrics** writes a server event, `ad_pack_validated`, for later drafts that pass the character checks. Security audit events are written either way and do not include the brief or the ad text.
