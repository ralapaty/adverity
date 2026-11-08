# ADR 004: SQLite as the MVP review store

- Status: accepted
- Date: 2026-11-08
- Deciders: Basava Rajendra Alapaty, Oleksandr Velykyi (sign-off still open)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

Approvals, versions, and evidence have to survive a process restart. The MVP is one advertiser, one ad group, and one locale, on one Node process. A later shared workspace for in-house teams is a commercial hypothesis, not this feature.

## Decision

The system of record is SQLite in the application's data directory, accessed only through the version and approval functions in ADR 001. The schema uses ordinary SQL types and constraints so a later move to Postgres can follow expand, migrate, and contract. The database file is not committed and is not world-readable.

Packs, versions, assets, evidence, playbook rows, role assignments, approvals, comments, and audit events live in this store. Export files are generated on read and are not a second source of truth.

## Consequences

- Positive: one file to back up, no extra database service on the critical path, transactions for "write version and clear approvals".
- Negative / trade-offs: two app instances would split the record. On Render the file is `/var/data/adverity.sqlite` on one persistent disk, so the service stays at one instance (ADR 007). SQLite write locks limit concurrent reviewers; that matches the MVP.
- Alternatives considered: Postgres from day one — sound for a shared workspace, and heavier than this feature needs. Client-side storage — rejected because approval integrity would sit with the caller.
