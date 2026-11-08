# Docker runtime — High-level design

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

## Goal

Build a production image of the existing Next.js process and run it with the product flag off, SQLite on a volume, and secrets outside the image.

## Containers

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml
title AdVerity container
Person(operator, "Operator")
Container(image, "adverity image", "Node 22, Next.js standalone", "Holding page and APIs. Flag defaults off.")
ContainerDb(volume, "adverity-data", "SQLite file", "/var/data/adverity.sqlite")
Rel(operator, image, "HTTP :3000")
Rel(image, volume, "Reads and writes")
footer CONFIDENTIAL — Internal use only. © HARA Solutions Limited & HealthCrew.ai
@enduml
```

## Decisions

| Decision | Trade-off |
|---|---|
| Standalone Next output | Smaller runtime stage. Render can keep `npm start`. |
| Node 22 bookworm-slim | Matches Render. May need `--experimental-sqlite`. |
| Non-root user | The volume must be writable by that user. |
| Compose volume, flag off | A local run is not a release. |
| Render blueprint unchanged | Docker does not force a dashboard change. |

## Risks

| Risk | Response |
|---|---|
| The image is built with a secret in the context | `.dockerignore` drops `.env`. Compose sets no keys. A test reads the Dockerfile and compose for forbidden values. |
| Node 22 refuses `node:sqlite` | The start path sets the experimental flag only if the import fails, and the smoke check imports it. |
| The daemon is absent | The suite still checks the files. The image build runs when Docker answers. |
