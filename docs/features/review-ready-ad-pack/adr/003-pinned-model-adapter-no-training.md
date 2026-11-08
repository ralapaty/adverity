# ADR 003: Pinned model adapter, no training

- Status: accepted
- Date: 2026-11-08
- Deciders: Basava Rajendra Alapaty, Fiodor Klemiato (sign-off still open)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Context

The brief allows an already-working multilingual endpoint plus a private playbook inserted into the prompt. It names Qwen as a research candidate, not as a proven winner. It forbids model training during this effort, and it forbids describing hosted inference as local-only. Self-hosting is in scope only when inference already works.

## Decision

The pipeline depends on a `ModelAdapter` port with three operations: `draft`, `criticise`, and `repair`. The running process binds that port to one configured endpoint. The version row stores `adapter_id` and `model_id`. Keys stay on the server.

Playbook records are copied into the data section of the request. They are not trained in. If the endpoint is unconfigured, the adapter returns `model_unavailable` and the pipeline does not invent copy.

Qwen may be selected later as that configured model. Selecting it does not add a benchmark claim to the product.

## Consequences

- Positive: tests mock the port. Swapping a working endpoint does not rewrite approval or validation code. The deadline does not depend on standing up new inference.
- Negative / trade-offs: hosted inference means page excerpts and briefs leave the process. The DPIA records that processor. A tiny playbook in the prompt will not scale; a retrieval index is a later decision, and it would still not be fine-tuning.
- Alternatives considered: training or fine-tuning on reviewed ads — rejected by the brief. Blocking the feature on a self-hosted model that is not already serving — rejected by the brief.
