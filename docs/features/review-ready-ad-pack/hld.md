# Review-ready ad pack — High-Level Design

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Goal

Give a freelance or in-house Google Ads practitioner one review-ready Search ad pack for one advertiser, one ad group, and locale `en-GB`. The pack is grounded in a fetched public page and a private playbook. Export stays closed until a copy expert and the route approver have approved the same version. The first deployment does nothing until `FEATURE_REVIEW_READY_AD_PACK` is `true`.

## Key decisions and trade-offs

- Approval and export rules run in the Ad Pack service, bound to a content hash. Prompt instructions are not the control. See ADR 001.
- The flag is a server environment variable, default off, read per request. See ADR 002.
- A pinned `ModelAdapter` calls an already-working hosted endpoint. The playbook is inserted as data. There is no training step. See ADR 003.
- SQLite is the system of record on one Node process. A shared multi-node workspace waits for a later ADR. See ADR 004.
- Roles are rows plus a server session. A client-side role switch cannot approve. See ADR 005.
- One Next.js application serves the holding page, the workspace, and the APIs, so the model key never ships to the browser. See ADR 006.
- Character limits are computed in `GoogleCounter`, then checked against current Google Ads counting rules before any production enablement. The ASCII fixtures in `requirements.md` are the regression set.
- Grona is outside this system. A campaign that promotes AdVerity is a different audience from a pack that advertises a customer's product.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A fetched page carries instructions that try to approve or exfiltrate the playbook | Page text is data. The model has no approve, export, or fetch tool. A1, R17 |
| Hosted inference receives page text and a brief | DPIA names the processor. Private playbook examples are not logged. Unconfirmed claims are excluded |
| Someone treats the HealthCrew illustration as a live customer or a publishable campaign | R20. Export remains a review extract. Publishing is out of scope |
| Demo role switching is mistaken for authentication | ADR 005. The UI states that the session is a pilot mechanism |
| Character-count code drifts from Google's current rules | Fixtures plus an explicit pre-enablement check in the low-level design. No silent truncation |
| Two servers split SQLite and disagree on approvals | Enablement is single-process until the store ADR is replaced |

## C4 L1 — System Context

Canonical file: `c4-context.puml`.

```plantuml
@startuml c4-context
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml
title AdVerity review-ready ad pack — System Context

Person(freelancer, "Freelance practitioner", "User-acquisition manager or Google Ads subject-matter expert, working for a client")
Person(inhouse, "In-house practitioner", "Google Ads subject-matter expert at the advertiser")
Person(expert, "Copy expert", "Reviews the creative. Overlap with the practitioner is stored, and is not called independent")
Person(client, "External client approver", "Freelance route. Approves facts, offer, and the exact version")
Person(owner, "Internal business owner", "In-house route. Authorised product, brand, or business owner")

System(adverity, "AdVerity", "Drafts evidence-grounded Google Search ads, records critique, and gates export on human approval of the exact version")

System_Ext(site, "Advertiser public site", "Untrusted source of product evidence")
System_Ext(model, "Pinned model endpoint", "Already-working multilingual inference. Hosted, not local-only")
System_Ext(elk, "ELK", "Security audit and consent-gated product telemetry")

Rel(freelancer, adverity, "Submits a brief and prepares a pack", "HTTPS")
Rel(inhouse, adverity, "Submits a brief and prepares a pack", "HTTPS")
Rel(expert, adverity, "Reviews the exact version", "HTTPS")
Rel(client, adverity, "Approves or withholds the exact version", "HTTPS")
Rel(owner, adverity, "Approves or withholds the exact version", "HTTPS")
Rel(adverity, site, "Fetches public pages through the URL guard", "HTTP/HTTPS")
Rel(adverity, model, "Draft, critique, one bounded repair", "HTTPS, server-side key")
Rel(adverity, elk, "Ships minimised structured logs", "Beats / agent")

footer CONFIDENTIAL — Internal use only · (c) HARA Solutions Limited & HealthCrew.ai
@enduml
```

## C4 L2 — Container

Canonical file: `c4-container.puml`.

```plantuml
@startuml c4-container
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
title AdVerity review-ready ad pack — Containers

Person(user, "Practitioner, copy expert, or approver", "Identity and role come from the server session and assignment rows")

System_Boundary(adverity, "AdVerity") {
  Container(web, "Web workspace", "Next.js", "Holding page while the flag is off. Review workspace while the flag is on")
  Container(api, "Ad Pack service", "Next.js route handlers", "Flag gate, orchestration, validation, approvals, export")
  Container(fetch, "Evidence fetcher", "Node", "Public URL retrieval with SSRF controls")
  ContainerDb(db, "Review store", "SQLite", "Packs, versions, evidence, playbook, approvals")
}

System_Ext(site, "Advertiser public site", "Untrusted")
System_Ext(model, "Pinned model endpoint", "Hosted inference")
System_Ext(elk, "ELK", "Logs, dashboards, alerts")

Rel(user, web, "Uses", "HTTPS")
Rel(web, api, "Calls", "JSON, same origin")
Rel(api, fetch, "Requests a guarded fetch")
Rel(fetch, site, "GET public URL", "HTTP/HTTPS")
Rel(api, model, "Draft, critic, repair", "HTTPS")
Rel(api, db, "Reads and writes review state", "SQL")
Rel(api, elk, "Structured events", "JSON")

footer CONFIDENTIAL — Internal use only · (c) HARA Solutions Limited & HealthCrew.ai
@enduml
```

## Flag-off and flag-on

| | Flag off | Flag on |
|---|---|---|
| UI | Holding page. No generate action | Workspace and "Generate a review-ready ad pack" |
| `POST /api/packs` | Unavailable. No side effects | Creates a draft pack |
| Model and fetch | Not called | Called under the budgets in A7 and A8 |
| Store | No pack rows | SQLite rows as in `er.puml` |
