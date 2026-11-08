# ADR 006: One Next.js server for UI and gates

- Status: accepted
- Date: 2026-11-08
- Deciders: Basava Rajendra Alapaty (sign-off still open)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

The feature needs a holding page, a workspace, JSON APIs, server-only secrets, and a flag that the client cannot bake in. The repository has no framework yet.

## Decision

Ship one Next.js application (current App Router, TypeScript). Route handlers implement the Ad Pack service. Server components and route handlers read the flag and the model key. The browser receives rendered pages and JSON results, not the key and not the private playbook.

## Consequences

- Positive: one deployable, one place for the flag, and the same origin for the cookie and CSRF check.
- Negative / trade-offs: the team accepts the Next.js release it pins. A separate Python model service is unnecessary while the adapter is an HTTPS client.
- Alternatives considered: a static site plus a second API — rejected for this MVP because it splits the flag and the session. A client-only app — rejected because it would expose the model key or move the gates into the browser.
