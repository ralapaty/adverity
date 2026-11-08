# OWASP and GDPR baseline — Requirements

> **CONFIDENTIAL — Internal use only.** © HARA Solutions Limited & HealthCrew.ai. Not for external distribution.

These requirements add controls. They do not replace R1–R33 of the review-ready ad pack. They do not authorise a claim of OWASP certification, GDPR certification, or completed legal review.

## Already in force

Content-Security-Policy with a nonce, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy`. CSRF on mutations. HttpOnly, SameSite=Lax session cookies, Secure in production. Session expiry is checked. The URL guard refuses private and metadata targets. Pack creation is rate-limited. Product metrics wait for consent. Approvals stay bound to a content hash. The review-pack flag defaults off.

## Requirements

- R1. When a sign-in attempt fails, the service shall count it against the source address. After 8 failures in 15 minutes the service shall respond 429 and shall not say whether the username exists.
- R2. While `NODE_ENV` is `production`, every response shall include `Strict-Transport-Security` with a max-age of at least six months. Otherwise the header shall be absent, so local HTTP keeps working.
- R3. When a signed-in person withdraws product-metric consent, the service shall delete that consent row and shall not write `ad_pack_validated` for them. Security audit events shall continue.
- R4. When a signed-in person requests their data, the service shall return the packs they created, without another person’s packs and without the playbook body.
- R5. When a signed-in person deletes their data, the service shall remove the packs they created, including versions, assets, evidence, comments, approvals, and handoff rows, and shall write an audit event that records the deletion without the brief or the ad text.
- R6. When the database opens, the service shall delete packs whose `created_at` is older than `ADVERITY_RETENTION_DAYS`. The default shall be 90. A value of `0` shall mean keep until a person deletes.
- R7. The holding page shall state that the session cookie is required to sign in and that product metrics wait for a separate yes.
- R8. While `FEATURE_REVIEW_READY_AD_PACK` is not exactly `true`, the holding page shall stay, and every API except feature flags and sign-in shall stay closed. Sign-in shall still enforce the failure limit. Production responses shall still send HSTS.
- R9. The change shall not weaken the URL guard, the CSRF check, the approval hash, or the Content-Security-Policy.
- R10. The service shall not describe these controls as a completed DPIA, a penetration test, or a certification.

## Out of scope

Pinning the outbound TCP connection to the checked DNS address. Enterprise single sign-on. A legal sign-off of the DPIA. Turning the review-pack flag on.
