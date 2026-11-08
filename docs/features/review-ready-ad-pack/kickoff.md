# Review-ready ad pack — Kickoff

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

spec-to-ship: review-ready ad pack
ticket: none — Zoho Projects is not connected
branch: `feat/review-ready-ad-pack`
date: 8 November 2026
product owner (from the brief): Basava Rajendra Alapaty, Engineer/Product Lead

## Context pre-flight

The open workspace is AdVerity. It had no files, no `AGENTS.md`, and no `.cursor/rules`. There is no existing behaviour to preserve. Flag-off behaviour is specified in N0b as the regression baseline: a static holding page, with no fetch, no model call, and no pack persistence.

The source brief is the 8 November 2026 strategy note, "AdVerity — Final Strategy and Example Output". Pain points, buying triggers, and pricing are hypotheses in that note. They are not written here as measured findings. HealthCrew.ai is the illustrative advertiser in the worked example. It is not a customer segment and not evidence of a paying relationship.

The logo files in `public/brand/` are a vector trace of the bitmap supplied on 8 November 2026. They are labelled as that trace in the SVG description. They are not a separate redesign.

## Zoho Projects

No Zoho Projects MCP namespace is connected in this session. Task creation and status moves are skipped. Setup, when wanted: [Zoho Projects MCP](https://help.zoho.com/portal/en/kb/projects/settings-in-zoho-projects/portal-configuration/articles/zoho-projects-mcp). Vaiz was not used.

## Definition of Ready

| Check | State |
|---|---|
| Problem, target users, and one success metric | Stated in `requirements.md` |
| Testable acceptance criteria | EARS R1–R23, N0a–N6, A1–A10 |
| Dependencies named | Pinned model endpoint and server-side key; private playbook curated before any production enablement; logo file; qualified en-GB reviewer assigned on the worked example |
| Feature flag named, default off | `FEATURE_REVIEW_READY_AD_PACK` |
| Flag-off / backward-compatible approach | N0b. Greenfield: flag off is the only behaviour that exists until enablement |
| Design sign-off | **Approved 2026-11-08** in this session, with instruction to start red-green implementation. Zoho Projects was not moved to In Development: no Zoho namespace is connected |

Known dependencies block a live model run and a production flag enablement. They do not block review of this design. Until sign-off, implementation stays unstarted.

## Delta kickoff — Render and the revised prompt

spec-to-ship: render and revised master prompt
ticket: none — Zoho Projects is still not connected. Vaiz was not used.
branch: `feat/render-revised-prompt`
date: 8 November 2026

The source brief for this delta is `docs/brief/AdVerity-Strategy-and-Revised-Master-Prompt.md`, with `AdVerity_Logo.svg` beside it. The running pack on `main` stays the regression baseline. Flag off remains N0b.

| Check | State |
|---|---|
| What changed | Render is the host. The prompt adds Search CSV shape, paths, keywords, headline roles, and a Performance Max text pack |
| Acceptance criteria | R24–R33, still behind `FEATURE_REVIEW_READY_AD_PACK` |
| Host | Render web service, one instance, disk `/var/data`. ADR 007, status proposed |
| Design sign-off | **Approved 2026-11-08** to implement R24–R33. Zoho Projects was not moved: no Zoho namespace is connected |

## Scope of this feature

One advertiser, one ad group, one locale (`en-GB`): turn a product URL, a short brief, and supplied keyword context into an evidence-grounded Google Search responsive-search-ad pack, then hold export until a copy expert and the route approver have signed the exact version.

## People named in the brief

| Person | Responsibility on this feature |
|---|---|
| Basava Rajendra Alapaty | Integration, model adapter, UI, versioning, deployment |
| Fiodor Klemiato | Intent mapping, playbook, prototype copy review |
| Oleksandr Velykyi | Ingestion controls, secrets, injection tests, approval integrity |
| Nene | Evidence quality, behavioural hypotheses, ethical and cultural critique. Surname and profile were not supplied |

## Artifacts in this phase

- `requirements.md`
- `hld.md` and ADRs under `adr/`
- `lld.md`, C4 component, sequence, state, and ER diagrams
- `observability.md`
- `threat-model.md`
- `dpia.md`
- `evals/golden-set.md` (criteria for the later eval run; not a claim that models were scored)
