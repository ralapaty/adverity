# ADR 002: Runtime feature flag, default off

- Status: accepted
- Date: 2026-11-08
- Deciders: Basava Rajendra Alapaty, Oleksandr Velykyi (sign-off still open)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

Deploy and release are separate. This repository has no users yet. The first deployment must still be a no-op until someone turns the feature on, and turning it off must not need a rebuild.

## Decision

`FEATURE_REVIEW_READY_AD_PACK` is read from the server environment on each request. The feature is on only when the value is exactly `true`. It is off when the variable is absent or has any other value.

The flag is not a `NEXT_PUBLIC_` variable and is not inlined at build time. While it is off, routes that would create a pack, fetch a URL, call the model, or open the workspace respond as unavailable, and the UI renders the holding page. `GET /api/feature-flags` reports the boolean.

## Consequences

- Positive: a process restart or environment reload is enough to enable or kill the feature. The client bundle does not contain a baked-on switch.
- Negative / trade-offs: a host that only injects variables at build time cannot use this flag as specified. The enablement play will reject that setup.
- Alternatives considered: a database flag — deferred until more than one node needs a shared switch. A build-time public flag — rejected because toggling it would require a deploy.
