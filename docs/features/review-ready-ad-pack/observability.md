# Review-ready ad pack — Observability (ELK)

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

Diagram: `observability-elk.puml`.

## Data flow

The Ad Pack service writes one JSON object per event through pino. Filebeat ships the stream. Logstash drops request bodies, page excerpts, playbook records, passphrases, and cookies, and keeps ids and hashes. Elasticsearch index: `adverity-review-ready-ad-pack-*`. Kibana holds the dashboard and alerts below.

Security audit events are written whether or not the practitioner has consented. Product-metric events are written only after consent (R23).

## Structured log events

| Event | Level | When | Fields |
|---|---|---|---|
| `flag_checked` | info | a gated route is hit | `trace_id`, `enabled` |
| `url_refused` | warn | UrlGuard fails | `trace_id`, `reason` (scheme, dns, private, redirect, timeout, size). No full URL query string |
| `ad_pack_drafted` | info | a version is stored | `trace_id`, `pack_id`, `version_id`, `validator_pass`, `incomplete`, `model_calls`, `elapsed_ms` |
| `model_unavailable` | error | timeout, HTTP failure, or schema rejection | `trace_id`, `adapter_id`, `model_id`, `elapsed_ms` |
| `approval_recorded` | info | an approval row is written | `trace_id`, `pack_id`, `version_id`, `role`, `actor_id` |
| `approval_rejected` | info | a call would have forged or reordered approval | `trace_id`, `pack_id`, `reason` |
| `export_attempt` | info | download allowed or refused | `trace_id`, `version_id`, `allowed`, `reason` |
| `ad_pack_validated` | info | product metric, consent only | `trace_id`, `pack_id`, `version_id`, `elapsed_ms`, `validator_pass` |

Logs omit brief text, ad text, evidence excerpts, and the `Authorization` header.

## Elasticsearch index

`adverity-review-ready-ad-pack-*`

ILM: hot for 7 days, delete at 30 days. That retention matches the DPIA operational-log period. Fields used by alerts: `event`, `trace_id`, `elapsed_ms`, `validator_pass`, `allowed`, `model_calls`, `enabled`.

## Kibana

- Dashboard **Review-ready ad pack**: drafts per hour, median `elapsed_ms` on `ad_pack_validated`, export refusals, `url_refused` by reason, `model_unavailable` rate.
- Saved search: `event: approval_rejected OR event: url_refused OR (event: export_attempt AND allowed: false)`.

## Alerts and SLOs

| Tie | Condition | Action |
|---|---|---|
| A7 | p95 `elapsed_ms` on `ad_pack_drafted` above 45 seconds for 15 minutes | page the engineer named on the rotation |
| A8 | any version with `model_calls` above 4 | page. The cap is three calls plus one repair |
| A4 | `model_unavailable` rate above 10 percent of drafts over 15 minutes | page |
| R3 | `url_refused` with reason `private` is expected in tests; a spike of successful fetches to link-local ranges is a defect and pages immediately | page |
| R15 | `export_attempt` with `allowed: true` while `validator_pass` is false | page. This is a gate failure |
| N1 | holding-page LCP, INP, or CLS synthetic check outside the N1 budget | ticket, and hold rollout |

The primary product metric is the median of `elapsed_ms` on consent-gated `ad_pack_validated` where `validator_pass` is true. It is not read from ad-platform reports.
