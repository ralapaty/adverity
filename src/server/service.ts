import { randomBytes, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { assessAssets } from "../domain/assess";
import { canRecordApproval, evaluateExport, routeRole, type ApprovalRecord, type ApprovalRole } from "../domain/approval";
import { runPipeline, type PipelineInput, type PipelineResult } from "../domain/pipeline";
import { classifyUrl } from "../domain/url-guard";
import { newId, verifyPassphrase } from "../db/db";
import type { AppDeps } from "./deps";

const createSchema = z.object({
  productUrl: z.string().min(1),
  brief: z.string().min(1),
  advertiser: z.string().min(1),
  userType: z.enum(["freelance", "in_house"]),
  objective: z.string().min(1),
  audience: z.string().min(1),
  adGroup: z.string().min(1),
  keywordThemes: z.array(z.string().min(1)).min(1),
  locale: z.string().min(2),
  destinationUrl: z.string().min(1),
  offerSummary: z.string().min(1),
});

export type PackInput = z.infer<typeof createSchema>;

export function tokensMatch(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signIn(db: DatabaseSync, username: string, passphrase: string): { sessionId: string; csrf: string; actorId: string } | null {
  const actor = db.prepare("SELECT id, passphrase_hash FROM actor WHERE id = ?").get(username) as
    | { id: string; passphrase_hash: string }
    | undefined;
  if (!actor) return null;
  if (!verifyPassphrase(passphrase, actor.passphrase_hash)) return null;
  const sessionId = newId("ses");
  const csrf = randomBytes(16).toString("hex");
  db.prepare("INSERT INTO session (id, actor_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)").run(
    sessionId,
    actor.id,
    csrf,
    Date.now() + 12 * 60 * 60 * 1000,
  );
  return { sessionId, csrf, actorId: actor.id };
}

export function endSession(db: DatabaseSync, sessionId: string): void {
  db.prepare("DELETE FROM session WHERE id = ?").run(sessionId);
}

export function actorFromSession(db: DatabaseSync, sessionId: string | null): { actorId: string; csrf: string } | null {
  if (!sessionId) return null;
  const row = db.prepare("SELECT actor_id, csrf_token, expires_at FROM session WHERE id = ?").get(sessionId) as
    | { actor_id: string; csrf_token: string; expires_at: number }
    | undefined;
  if (!row || row.expires_at < Date.now()) return null;
  return { actorId: row.actor_id, csrf: row.csrf_token };
}

function audit(
  db: DatabaseSync,
  deps: AppDeps,
  event: string,
  fields: { traceId: string; packId?: string; versionId?: string; actorId?: string; detail?: Record<string, unknown> },
): void {
  db.prepare(
    "INSERT INTO audit_event (id, trace_id, event, pack_id, version_id, actor_id, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(newId("aud"), fields.traceId, event, fields.packId ?? null, fields.versionId ?? null, fields.actorId ?? null, JSON.stringify(fields.detail ?? {}), new Date().toISOString());
  deps.log({ event, trace_id: fields.traceId, pack_id: fields.packId, version_id: fields.versionId, actor_id: fields.actorId, ...(fields.detail ?? {}) });
}

function allowCreate(db: DatabaseSync, actorId: string, limit: number): boolean {
  const windowMs = 60 * 60 * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  db.prepare(
    `INSERT INTO rate_bucket (actor_id, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(actor_id, window_start) DO UPDATE SET count = count + 1`,
  ).run(actorId, windowStart);
  const row = db.prepare("SELECT count FROM rate_bucket WHERE actor_id = ? AND window_start = ?").get(actorId, windowStart) as { count: number };
  return row.count <= limit;
}

export async function createPack(db: DatabaseSync, deps: AppDeps, actorId: string, raw: unknown, traceId: string) {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, status: 400, reason: "invalid_input" };
  const limit = Number(deps.env.ADVERITY_PACK_RATE_LIMIT || 30);
  if (!allowCreate(db, actorId, limit)) return { ok: false as const, status: 429, reason: "rate_limited" };
  const input = parsed.data;
  const started = Date.now();
  const result = await runPipeline(input as PipelineInput, {
    resolveHost: deps.resolveHost,
    fetchExcerpt: (url) =>
      deps.fetchExcerpt(url, {
        resolveHost: deps.resolveHost,
        fetchImpl: deps.fetchImpl,
        evidenceMode: deps.env.EVIDENCE_MODE,
      }),
    adapter: deps.adapter,
  });
  const packId = newId("pack");
  const now = new Date().toISOString();
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO pack (id, advertiser, user_type, audience, objective, ad_group, locale, destination_url, offer_summary, product_url, brief, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(packId, input.advertiser, input.userType, input.audience, input.objective, input.adGroup, input.locale, input.destinationUrl, input.offerSummary, input.productUrl, input.brief, actorId, now);
    db.prepare("INSERT INTO role_assignment (id, pack_id, role, actor_id, can_assess_locale) VALUES (?, ?, 'practitioner', ?, 1)").run(newId("role"), packId, actorId);
    const versionId = insertVersion(db, packId, 1, input, result, Date.now() - started);
    db.exec("COMMIT");
    audit(db, deps, "ad_pack_drafted", {
      traceId,
      packId,
      versionId,
      actorId,
      detail: { validator_pass: result.validationPassed, incomplete: result.incomplete, model_calls: result.modelCalls, elapsed_ms: Date.now() - started },
    });
    if (result.status === "model_unavailable") {
      audit(db, deps, "model_unavailable", { traceId, packId, versionId, actorId, detail: { adapter_id: result.adapterId, model_id: result.modelId } });
    }
    const consented = db.prepare("SELECT actor_id FROM consent WHERE actor_id = ?").get(actorId);
    if (consented && result.validationPassed) {
      audit(db, deps, "ad_pack_validated", { traceId, packId, versionId, actorId, detail: { elapsed_ms: Date.now() - started, validator_pass: true } });
    }
    return { ok: true as const, packId };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function insertVersion(db: DatabaseSync, packId: string, number: number, input: { locale: string }, result: PipelineResult, elapsed: number): string {
  const versionId = newId("ver");
  db.prepare(
    `INSERT INTO pack_version (
      id, pack_id, version_number, content_hash, playbook_version_id, validation_passed, incomplete,
      language_review_required, adapter_id, model_id, status, limitations_json, assumptions_json, intent_json,
      critique_json, model_calls, elapsed_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    versionId,
    packId,
    number,
    result.contentHash,
    result.playbookVersion,
    result.validationPassed ? 1 : 0,
    result.incomplete ? 1 : 0,
    result.languageReviewRequired ? 1 : 0,
    result.adapterId,
    result.modelId,
    result.status,
    JSON.stringify(result.limitations),
    JSON.stringify(result.assumptions),
    JSON.stringify(result.intentMap),
    JSON.stringify(result.critique),
    result.modelCalls,
    elapsed,
    new Date().toISOString(),
  );
  const insertAsset = db.prepare(
    "INSERT INTO asset (id, pack_version_id, kind, position, text, angle, google_count, flags_json, evidence_ids_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const asset of result.assets) {
    insertAsset.run(newId("asset"), versionId, asset.kind, asset.position, asset.text, asset.angle, asset.googleCount, JSON.stringify(asset.flags), JSON.stringify(asset.evidenceIds));
  }
  const insertEvidence = db.prepare(
    "INSERT INTO evidence_excerpt (id, pack_id, source_url, retrieved_at, excerpt, label) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const item of result.evidence) {
    insertEvidence.run(item.id, packId, item.sourceUrl, new Date().toISOString(), item.excerpt, item.label);
  }
  return versionId;
}

function loadApprovals(db: DatabaseSync, versionId: string): ApprovalRecord[] {
  const rows = db.prepare("SELECT role, actor_id, decision, content_hash FROM approval WHERE pack_version_id = ?").all(versionId) as Array<{
    role: ApprovalRole;
    actor_id: string;
    decision: "approved";
    content_hash: string;
  }>;
  return rows.map((row) => ({ role: row.role, actorId: row.actor_id, decision: row.decision, contentHash: row.content_hash }));
}

type PackRow = {
  id: string;
  advertiser: string;
  user_type: "freelance" | "in_house";
  audience: string;
  objective: string;
  ad_group: string;
  locale: string;
  destination_url: string;
  offer_summary: string;
  created_by: string;
  offer_confirmed: number;
  destination_confirmed: number;
  roles_overlap: number;
};

function latestVersion(db: DatabaseSync, packId: string) {
  return db.prepare("SELECT * FROM pack_version WHERE pack_id = ? ORDER BY version_number DESC LIMIT 1").get(packId) as
    | {
        id: string;
        version_number: number;
        content_hash: string | null;
        playbook_version_id: string | null;
        validation_passed: number;
        incomplete: number;
        language_review_required: number;
        status: string;
        limitations_json: string;
        assumptions_json: string;
        intent_json: string;
        critique_json: string;
      }
    | undefined;
}

export function packView(db: DatabaseSync, packId: string) {
  const pack = db.prepare("SELECT * FROM pack WHERE id = ?").get(packId) as PackRow | undefined;
  if (!pack) return null;
  const version = latestVersion(db, packId);
  if (!version) return null;
  const assets = db.prepare("SELECT * FROM asset WHERE pack_version_id = ? ORDER BY kind, position").all(version.id) as Array<{
    kind: "headline" | "description";
    position: number;
    text: string;
    angle: string;
    google_count: number | null;
    flags_json: string;
    evidence_ids_json: string;
  }>;
  const evidence = db.prepare("SELECT id, source_url, label, excerpt FROM evidence_excerpt WHERE pack_id = ?").all(packId) as Array<{
    id: string;
    source_url: string;
    label: string;
    excerpt: string;
  }>;
  const assignments = db.prepare("SELECT role, actor_id, can_assess_locale FROM role_assignment WHERE pack_id = ?").all(packId) as Array<{
    role: string;
    actor_id: string;
    can_assess_locale: number;
  }>;
  const approvals = loadApprovals(db, version.id);
  const route = routeRole(pack.user_type);
  const unconfirmed = assets.some((asset) => JSON.parse(asset.flags_json).includes("unconfirmed_offer"));
  const decision = evaluateExport({
    validationPassed: version.validation_passed === 1,
    contentHash: version.content_hash ?? "",
    userType: pack.user_type,
    languageReviewRequired: version.language_review_required === 1,
    rolesOverlap: pack.roles_overlap === 1,
    approvals,
    offerConfirmed: !unconfirmed || pack.offer_confirmed === 1,
    destinationConfirmed: pack.destination_confirmed === 1,
  });
  const approved = (role: string) => approvals.some((row) => row.role === role && row.contentHash === version.content_hash);
  let status = version.status;
  if (decision.eligible) status = "export_eligible";
  const view = {
    id: pack.id,
    status,
    user_type: pack.user_type,
    advertiser: pack.advertiser,
    audience: pack.audience,
    approver_route: pack.user_type === "freelance" ? "freelance_external_client" : "inhouse_internal_owner",
    evidence,
    assumptions: JSON.parse(version.assumptions_json) as string[],
    intent_map: (JSON.parse(version.intent_json) as Array<{ keywordTheme: string; intentLabel: string; researched: boolean }>).map((row) => ({
      keyword_theme: row.keywordTheme,
      intent_label: row.intentLabel,
      researched: row.researched,
    })),
    playbook_version: version.playbook_version_id,
    market_packs: [
      {
        version_id: version.id,
        version_number: version.version_number,
        locale: pack.locale,
        content_hash: version.content_hash,
        validation_passed: version.validation_passed === 1,
        incomplete: version.incomplete === 1,
        export_eligible: decision.eligible,
        independent_review: decision.independentReview,
        roles_overlap: pack.roles_overlap === 1,
        language_review_required: version.language_review_required === 1,
        assets: assets.map((asset) => ({
          kind: asset.kind,
          text: asset.text,
          angle: asset.angle,
          evidence_ids: JSON.parse(asset.evidence_ids_json) as string[],
          flags: JSON.parse(asset.flags_json) as string[],
          google_count: asset.google_count,
        })),
        review: {
          copy_expert: approved("copy_expert") ? "approved" : assignments.some((row) => row.role === "copy_expert") ? "pending" : "unassigned",
          route: approved(route) ? "approved" : assignments.some((row) => row.role === route) ? "pending" : "unassigned",
          language: version.language_review_required === 0 ? "not_required" : approved("language_reviewer") ? "approved" : "pending",
        },
      },
    ],
    critique_log: (JSON.parse(version.critique_json) as Array<{ beforeText: string; issue: string; afterText: string }>).map((entry) => ({
      before: entry.beforeText,
      issue: entry.issue,
      after: entry.afterText,
    })),
    limitations: JSON.parse(version.limitations_json) as string[],
    assignments: assignments.map((row) => ({
      role: row.role,
      actor_id: row.actor_id,
      can_assess_locale: row.can_assess_locale === 1,
    })),
  };
  return view;
}

export function addComment(db: DatabaseSync, deps: AppDeps, actorId: string, packId: string, body: string, traceId: string) {
  const version = latestVersion(db, packId);
  if (!version) return { ok: false as const, status: 404, reason: "missing" };
  if (!body.trim()) return { ok: false as const, status: 400, reason: "empty" };
  db.prepare("INSERT INTO comment (id, pack_version_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)").run(
    newId("cmt"),
    version.id,
    actorId,
    body.trim(),
    new Date().toISOString(),
  );
  audit(db, deps, "comment_recorded", { traceId, packId, versionId: version.id, actorId });
  return { ok: true as const };
}

const ASSIGNABLE = new Set(["copy_expert", "external_client", "internal_owner", "language_reviewer"]);

export function assignRole(
  db: DatabaseSync,
  actorId: string,
  packId: string,
  role: string,
  username: string,
  canAssessLocale: boolean,
) {
  const pack = db.prepare("SELECT created_by, user_type FROM pack WHERE id = ?").get(packId) as { created_by: string; user_type: string } | undefined;
  if (!pack) return { ok: false as const, status: 404, reason: "missing" };
  if (pack.created_by !== actorId) return { ok: false as const, status: 403, reason: "forbidden" };
  if (!ASSIGNABLE.has(role)) return { ok: false as const, status: 400, reason: "bad_role" };
  const person = db.prepare("SELECT id FROM actor WHERE id = ?").get(username) as { id: string } | undefined;
  if (!person) return { ok: false as const, status: 400, reason: "unknown_actor" };
  db.prepare("DELETE FROM role_assignment WHERE pack_id = ? AND role = ?").run(packId, role);
  db.prepare("INSERT INTO role_assignment (id, pack_id, role, actor_id, can_assess_locale) VALUES (?, ?, ?, ?, ?)").run(
    newId("role"),
    packId,
    role,
    person.id,
    canAssessLocale ? 1 : 0,
  );
  const practitioner = db.prepare("SELECT actor_id FROM role_assignment WHERE pack_id = ? AND role = 'practitioner'").get(packId) as { actor_id: string };
  const expert = db.prepare("SELECT actor_id, can_assess_locale FROM role_assignment WHERE pack_id = ? AND role = 'copy_expert'").get(packId) as
    | { actor_id: string; can_assess_locale: number }
    | undefined;
  const overlap = expert ? expert.actor_id === practitioner.actor_id : false;
  db.prepare("UPDATE pack SET roles_overlap = ? WHERE id = ?").run(overlap ? 1 : 0, packId);
  const version = latestVersion(db, packId);
  if (version) {
    const locale = (db.prepare("SELECT locale FROM pack WHERE id = ?").get(packId) as { locale: string }).locale;
    const required = locale !== "en-GB" || (expert ? expert.can_assess_locale === 0 : false);
    db.prepare("UPDATE pack_version SET language_review_required = ? WHERE id = ?").run(required ? 1 : 0, version.id);
  }
  return { ok: true as const };
}

export function recordApproval(
  db: DatabaseSync,
  deps: AppDeps,
  actorId: string,
  packId: string,
  role: ApprovalRole,
  confirms: { offer: boolean; destination: boolean },
  traceId: string,
) {
  const pack = db.prepare("SELECT * FROM pack WHERE id = ?").get(packId) as PackRow | undefined;
  const version = pack ? latestVersion(db, packId) : undefined;
  if (!pack || !version || !version.content_hash) return { ok: false as const, status: 404, reason: "missing" };
  const assignments = db.prepare("SELECT role, actor_id FROM role_assignment WHERE pack_id = ?").all(packId) as Array<{ role: string; actor_id: string }>;
  const approvals = loadApprovals(db, version.id);
  const gate = canRecordApproval({
    actorId,
    role,
    userType: pack.user_type,
    contentHash: version.content_hash,
    assignments: assignments.map((row) => ({ role: row.role, actorId: row.actor_id })),
    approvals,
  });
  if (!gate.ok) {
    audit(db, deps, "approval_rejected", { traceId, packId, versionId: version.id, actorId, detail: { reason: gate.reason } });
    return { ok: false as const, status: 403, reason: gate.reason };
  }
  const assets = db.prepare("SELECT flags_json FROM asset WHERE pack_version_id = ?").all(version.id) as Array<{ flags_json: string }>;
  const needsOffer = assets.some((asset) => (JSON.parse(asset.flags_json) as string[]).includes("unconfirmed_offer"));
  if (role === routeRole(pack.user_type)) {
    if (!confirms.destination || (needsOffer && !confirms.offer)) {
      audit(db, deps, "approval_rejected", { traceId, packId, versionId: version.id, actorId, detail: { reason: "confirmation_required" } });
      return { ok: false as const, status: 400, reason: "confirmation_required" };
    }
    db.prepare("UPDATE pack SET offer_confirmed = ?, destination_confirmed = ? WHERE id = ?").run(confirms.offer ? 1 : 0, 1, packId);
  }
  db.prepare(
    "INSERT INTO approval (id, pack_version_id, role, actor_id, decision, content_hash, created_at) VALUES (?, ?, ?, ?, 'approved', ?, ?)",
  ).run(newId("apr"), version.id, role, actorId, version.content_hash, new Date().toISOString());
  audit(db, deps, "approval_recorded", { traceId, packId, versionId: version.id, actorId, detail: { role } });
  return { ok: true as const };
}

export async function revisePack(
  db: DatabaseSync,
  deps: AppDeps,
  actorId: string,
  packId: string,
  change: { position?: number; kind?: "headline" | "description"; text?: string; offerSummary?: string; locale?: string; destinationUrl?: string },
  traceId: string,
) {
  const pack = db.prepare("SELECT * FROM pack WHERE id = ?").get(packId) as PackRow | undefined;
  const version = pack ? latestVersion(db, packId) : undefined;
  if (!pack || !version) return { ok: false as const, status: 404, reason: "missing" };
  if (pack.created_by !== actorId) return { ok: false as const, status: 403, reason: "forbidden" };
  const destinationUrl = change.destinationUrl || pack.destination_url;
  if (change.destinationUrl) {
    const guarded = await classifyUrl(destinationUrl, deps.resolveHost);
    if (!guarded.ok) return { ok: false as const, status: 400, reason: "destination_refused" };
  }
  const locale = change.locale || pack.locale;
  const offerSummary = change.offerSummary || pack.offer_summary;
  const currentAssets = db.prepare("SELECT kind, position, text, angle, evidence_ids_json FROM asset WHERE pack_version_id = ?").all(version.id) as Array<{
    kind: "headline" | "description";
    position: number;
    text: string;
    angle: string;
    evidence_ids_json: string;
  }>;
  const edited = currentAssets.map((asset) => ({
    kind: asset.kind,
    position: asset.position,
    text: change.text && change.kind === asset.kind && change.position === asset.position ? change.text : asset.text,
    angle: asset.angle,
    evidenceIds: JSON.parse(asset.evidence_ids_json) as string[],
  }));
  const assessed = assessAssets(edited, { locale, destinationUrl, offerSummary });
  const expert = db.prepare("SELECT can_assess_locale FROM role_assignment WHERE pack_id = ? AND role = 'copy_expert'").get(packId) as
    | { can_assess_locale: number }
    | undefined;
  const languageReviewRequired = locale !== "en-GB" || expert?.can_assess_locale === 0;
  const result: PipelineResult = {
    status: assessed.validationPassed ? "draft" : "validation_failed",
    evidence: [],
    assumptions: JSON.parse(version.assumptions_json),
    intentMap: JSON.parse(version.intent_json),
    playbookVersion: version.playbook_version_id,
    assets: assessed.assets,
    critique: JSON.parse(version.critique_json),
    limitations: assessed.limitations,
    validationPassed: assessed.validationPassed,
    incomplete: assessed.incomplete,
    languageReviewRequired,
    adapterId: "human-edit",
    modelId: "none",
    modelCalls: 0,
    contentHash: assessed.contentHash,
    unconfirmedOffer: assessed.unconfirmedOffer,
  };
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE pack SET locale = ?, destination_url = ?, offer_summary = ?, offer_confirmed = 0, destination_confirmed = 0 WHERE id = ?").run(
      locale,
      destinationUrl,
      offerSummary,
      packId,
    );
    insertVersion(db, packId, version.version_number + 1, { locale }, result, 0);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  audit(db, deps, "version_revised", { traceId, packId, actorId, detail: { cleared_approvals: true } });
  return { ok: true as const };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function exportPack(db: DatabaseSync, deps: AppDeps, actorId: string, packId: string, traceId: string) {
  const view = packView(db, packId);
  const version = latestVersion(db, packId);
  const pack = db.prepare("SELECT ad_group, locale, destination_url FROM pack WHERE id = ?").get(packId) as
    | { ad_group: string; locale: string; destination_url: string }
    | undefined;
  if (!view || !version || !pack) return { ok: false as const, status: 404, reason: "missing" };
  const assigned = db.prepare("SELECT 1 AS ok FROM role_assignment WHERE pack_id = ? AND actor_id = ?").get(packId, actorId);
  if (!assigned) {
    audit(db, deps, "export_attempt", { traceId, packId, versionId: version.id, actorId, detail: { allowed: false, reason: "not_assigned" } });
    return { ok: false as const, status: 403, reason: "forbidden" };
  }
  const market = view.market_packs[0];
  const allowed = market.export_eligible;
  db.prepare("INSERT INTO export_attempt (id, pack_version_id, actor_id, allowed, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    newId("exp"),
    version.id,
    actorId,
    allowed ? 1 : 0,
    allowed ? "ready" : view.status,
    new Date().toISOString(),
  );
  audit(db, deps, "export_attempt", { traceId, packId, versionId: version.id, actorId, detail: { allowed, reason: allowed ? "ready" : view.status } });
  if (!allowed) return { ok: false as const, status: 409, reason: "export_blocked" };
  const lines = ["# Human-review extract. Not a tested Google Ads Editor import.", "campaign,ad_group,locale,headline,description,final_url,review_version"];
  for (const asset of market.assets) {
    lines.push(
      [
        csvCell(pack.ad_group),
        csvCell(pack.ad_group),
        csvCell(pack.locale),
        csvCell(asset.kind === "headline" ? asset.text : ""),
        csvCell(asset.kind === "description" ? asset.text : ""),
        csvCell(pack.destination_url),
        csvCell(String(market.version_number)),
      ].join(","),
    );
  }
  return { ok: true as const, body: lines.join("\n") };
}

export function grantConsent(db: DatabaseSync, actorId: string): void {
  db.prepare("INSERT INTO consent (actor_id, granted_at) VALUES (?, ?) ON CONFLICT(actor_id) DO UPDATE SET granted_at = excluded.granted_at").run(
    actorId,
    new Date().toISOString(),
  );
}
