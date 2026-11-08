# Docker runtime — Threat model

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

| ID | Threat | Mitigation |
|---|---|---|
| D1 | A secret in the build context is copied into a layer | `.dockerignore` excludes `.env` and data files. Compose does not set keys. The file test rejects a passphrase or `MODEL_API_KEY=` assignment. |
| D2 | The process runs as root and a volume write escapes as root on the host | The runtime stage sets `USER` to a non-root account. |
| D3 | The published port exposes the pilot with the flag on by default | The image and compose default the flag to false. The holding page is what port 3000 serves. |
| D4 | A container restart without a volume drops approvals | Compose mounts `/var/data`. The runbook says an unmounted container is ephemeral. |
| D5 | The image is treated as a scanned, signed production artifact | Docs say it is not deployed and not certified. |

The application threat model is unchanged. The container does not open private-network fetches, and it does not add a new trust boundary beyond the operator who starts it.
