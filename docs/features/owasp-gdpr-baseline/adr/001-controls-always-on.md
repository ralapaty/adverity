# ADR 001 — Security controls are not dark-launched

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Date: 2026-11-08. Status: proposed.

## Context

The spec-to-ship rule is that a new feature stays behind a flag that defaults off. Sign-in limiting, transport security, consent withdrawal, access, erasure, and retention close holes that exist when the process is running. A flag that left them off would preserve the hole.

## Decision

`FEATURE_REVIEW_READY_AD_PACK` remains the product flag and stays off until an operator sets it. The controls in R1–R7 run whenever the process runs. Sign-in stays available while the flag is off so the failure limit still counts. The workspace stays hidden. Production-only behaviour is limited to HSTS (R2).

## Consequences

A deploy of this change alters sign-in and response headers even while the product flag is off. Local HTTP does not send HSTS. The DPIA stays a draft.
