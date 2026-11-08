# ADR 005: Roles are assigned on the server

- Status: accepted
- Date: 2026-11-08
- Deciders: Basava Rajendra Alapaty, Oleksandr Velykyi (sign-off still open)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

The brief allows a demo of more than one route, and it says demo role switching is not production authentication. The same person may be practitioner and copy expert only when that overlap is recorded. Client and internal-owner approval are different routes.

## Decision

A session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`) identifies the actor after a server-side sign-in. Role assignments for a pack are rows written by the service. The browser cannot grant itself copy expert, client approver, or internal owner by toggling a control.

This session is MVP authentication for a single-operator pilot. It is not an enterprise identity provider, and the UI says so. Production single sign-on is out of scope.

A pack's `user_type` is chosen when the pack is created and does not change by navigation.

## Consequences

- Positive: approval identity is the session actor plus a role row. Spoofing a role from the client fails closed.
- Negative / trade-offs: the pilot needs a real assignment step before a review can be completed. That is the point of R13. Password storage has to be a slow hash; the threat model covers it.
- Alternatives considered: a "view as client" switch — rejected by the brief. Shipping without authentication because the demo is small — rejected because approval rows would have no actor.
