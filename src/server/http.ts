import { isReviewPackEnabled } from "../domain/flag";
import type { ApprovalRole } from "../domain/approval";
import { appDeps, database } from "./deps";
import {
  actorFromSession,
  addComment,
  assignRole,
  createPack,
  endSession,
  exportPack,
  grantConsent,
  packView,
  recordApproval,
  revisePack,
  signIn,
  tokensMatch,
} from "./service";

function cookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index) === name) return decodeURIComponent(part.slice(index + 1));
  }
  return null;
}

function secureCookie(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "production";
}

function sessionCookie(id: string, secure: boolean): string {
  return `adverity_session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure ? "; Secure" : ""}`;
}

async function fields(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const text = await request.text();
    if (!text.trim()) return {};
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return {};
    }
    if (!json || typeof json !== "object" || Array.isArray(json)) return {};
    const record = json as Record<string, unknown>;
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") flat[key] = String(value);
    }
    if (Array.isArray(record.keywordThemes)) flat.keywordThemes = (record.keywordThemes as string[]).join(", ");
    return flat;
  }
  return Object.fromEntries(new URLSearchParams(await request.text()));
}

function wantsHtml(request: Request): boolean {
  return (request.headers.get("content-type") || "").includes("application/x-www-form-urlencoded");
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

export async function handleRequest(request: Request): Promise<Response> {
  const deps = appDeps();
  const url = new URL(request.url);
  const traceId = crypto.randomUUID();
  if (url.pathname === "/api/feature-flags" && request.method === "GET") {
    return json({ review_ready_ad_pack: isReviewPackEnabled(deps.env) });
  }
  if (!isReviewPackEnabled(deps.env)) {
    if (url.pathname.startsWith("/api/")) return json({ error: "not_found" }, 404);
  }
  const db = database();
  const session = actorFromSession(db, cookie(request.headers.get("cookie"), "adverity_session"));

  if (url.pathname === "/api/session" && request.method === "POST") {
    const body = await fields(request);
    const signed = signIn(db, body.username || "", body.passphrase || "");
    if (!signed) return json({ error: "sign_in_failed" }, 401);
    const headers = { "set-cookie": sessionCookie(signed.sessionId, secureCookie(deps.env)) };
    if (wantsHtml(request)) return new Response(null, { status: 303, headers: { ...headers, location: "/" } });
    return json({ actorId: signed.actorId, csrf: signed.csrf }, 200, headers);
  }
  if (url.pathname === "/api/session" && request.method === "DELETE") {
    const sessionId = cookie(request.headers.get("cookie"), "adverity_session");
    if (sessionId) endSession(db, sessionId);
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": "adverity_session=; HttpOnly; Path=/; Max-Age=0" } });
  }

  if (!session) return json({ error: "sign_in_required" }, 401);
  if (request.method !== "GET" && request.method !== "HEAD") {
    const bodyPreview = request.clone();
    const incoming = (await fields(bodyPreview)).csrf || request.headers.get("x-adverity-csrf") || "";
    if (!tokensMatch(incoming, session.csrf)) return json({ error: "csrf" }, 403);
  }

  if (url.pathname === "/api/sign-out" && request.method === "POST") {
    const sessionId = cookie(request.headers.get("cookie"), "adverity_session");
    if (sessionId) endSession(db, sessionId);
    const headers = { location: "/", "set-cookie": "adverity_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" };
    return new Response(null, { status: 303, headers });
  }

  if (url.pathname === "/api/consent" && request.method === "POST") {
    grantConsent(db, session.actorId);
    if (wantsHtml(request)) return new Response(null, { status: 303, headers: { location: "/" } });
    return json({ consent: true });
  }

  if (url.pathname === "/api/packs" && request.method === "POST") {
    const body = await fields(request);
    const created = await createPack(
      db,
      deps,
      session.actorId,
      {
        productUrl: body.productUrl,
        brief: body.brief,
        advertiser: body.advertiser,
        userType: body.userType,
        objective: body.objective,
        audience: body.audience,
        adGroup: body.adGroup,
        keywordThemes: (body.keywordThemes || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean),
        locale: body.locale || "en-GB",
        destinationUrl: body.destinationUrl,
        offerSummary: body.offerSummary,
      },
      traceId,
    );
    if (!created.ok) return json({ status: created.reason }, created.status);
    if (wantsHtml(request)) return new Response(null, { status: 303, headers: { location: `/packs/${created.packId}` } });
    return json(packView(db, created.packId), 201);
  }

  const packMatch = url.pathname.match(/^\/api\/packs\/(pack_[a-f0-9]{16})(\/([a-z]+))?$/);
  if (!packMatch) return json({ error: "not_found" }, 404);
  const packId = packMatch[1];
  const action = packMatch[3] || "";
  if (!action && request.method === "GET") {
    const view = packView(db, packId);
    return view ? json(view) : json({ error: "not_found" }, 404);
  }
  if (action === "comments" && request.method === "POST") {
    const body = await fields(request);
    const result = addComment(db, deps, session.actorId, packId, body.body || "", traceId);
    if (!result.ok) return json({ status: result.reason }, result.status);
    if (wantsHtml(request)) return new Response(null, { status: 303, headers: { location: `/packs/${packId}` } });
    return json(packView(db, packId));
  }
  if (action === "assignments" && request.method === "POST") {
    const body = await fields(request);
    const result = assignRole(db, session.actorId, packId, body.role || "", body.username || "", body.canAssessLocale !== "false");
    if (!result.ok) return json({ status: result.reason }, result.status);
    if (wantsHtml(request)) return new Response(null, { status: 303, headers: { location: `/packs/${packId}` } });
    return json(packView(db, packId));
  }
  if (action === "approvals" && request.method === "POST") {
    const body = await fields(request);
    const result = recordApproval(
      db,
      deps,
      session.actorId,
      packId,
      body.role as ApprovalRole,
      { offer: body.confirmOffer === "true" || body.confirmOffer === "on", destination: body.confirmDestination === "true" || body.confirmDestination === "on" },
      traceId,
    );
    if (!result.ok) return json({ status: result.reason }, result.status);
    if (wantsHtml(request)) return new Response(null, { status: 303, headers: { location: `/packs/${packId}` } });
    return json(packView(db, packId));
  }
  if (action === "revisions" && request.method === "POST") {
    const body = await fields(request);
    const result = await revisePack(
      db,
      deps,
      session.actorId,
      packId,
      {
        position: body.position ? Number(body.position) : undefined,
        kind: body.kind === "description" ? "description" : body.kind === "headline" ? "headline" : undefined,
        text: body.text,
        offerSummary: body.offerSummary,
        locale: body.locale,
        destinationUrl: body.destinationUrl,
      },
      traceId,
    );
    if (!result.ok) return json({ status: result.reason }, result.status);
    if (wantsHtml(request)) return new Response(null, { status: 303, headers: { location: `/packs/${packId}` } });
    return json(packView(db, packId));
  }
  if (action === "export" && request.method === "GET") {
    const result = exportPack(db, deps, session.actorId, packId, traceId);
    if (!result.ok) return json({ status: result.reason }, result.status);
    return new Response(result.body, { headers: { "content-type": "text/csv; charset=utf-8" } });
  }
  return json({ error: "not_found" }, 404);
}
