# ADR 001: Approval gates live in application code

- Status: accepted
- Date: 2026-11-08
- Deciders: Basava Rajendra Alapaty, Fiodor Klemiato, Oleksandr Velykyi, Nene (sign-off still open)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

The brief requires copy-expert review and a second approval on the exact version. Comments must not approve. Edits to ad text, offer, locale, or destination must clear both approvals. A missing approver must leave the pack pending. Validation failure must block export. Prompt text alone can be ignored by a model, and a model must not be the approver.

## Decision

The Ad Pack service decides export eligibility in code. A version is export-eligible only when all of the following are true for one `content_hash`:

- the deterministic validator passed
- a copy-expert approval row exists for that version
- the route approver's approval row exists for that version
- language-review approval exists when the assignment says it is required
- `roles_overlap` is stored and disclosed when one person holds practitioner and copy expert

Export eligibility is computed on read. It is not a flag the client can set. Model output cannot insert approval rows.

## Consequences

- Positive: gates stay enforceable when the prompt, the model, or the UI is wrong.
- Negative / trade-offs: every edit path must go through the version writer. A stray update query would bypass the rule, so the data access layer exposes `appendVersion` and `recordApproval` rather than a general row update.
- Alternatives considered: asking the model to "never export until approved" — rejected because the brief says application code enforces the controls. Client-side hiding of the export button — rejected because the API would still be callable.
