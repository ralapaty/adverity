import { createServer, type Server } from "node:http";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PRIVATE_PLAYBOOK_SENTINEL } from "../../src/domain/playbook";
import { setTestDeps, type AppDeps } from "../../src/server/deps";
import { handleRequest } from "../../src/server/http";

const passphrase = "pilot-passphrase-for-tests";

type Session = { cookie: string; csrf: string };
type PackBody = {
  id: string;
  status: string;
  user_type: string;
  advertiser: string;
  audience: string;
  approver_route: string;
  playbook_version: string;
  market_packs: Array<{
    version_id: string;
    version_number: number;
    export_eligible: boolean;
    validation_passed: boolean;
    independent_review: boolean;
    roles_overlap: boolean;
    assets: Array<{ text: string; google_count: number; flags: string[] }>;
  }>;
  critique_log: Array<{ before: string; issue: string }>;
};

async function listen(): Promise<{ server: Server; origin: string }> {
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
    }
    const init: RequestInit = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") init.body = Buffer.concat(chunks);
    let response: Response;
    try {
      response = await handleRequest(new Request(`http://127.0.0.1${req.url}`, init));
    } catch {
      response = new Response(JSON.stringify({ error: "server" }), { status: 500, headers: { "content-type": "application/json" } });
    }
    res.statusCode = response.status;
    const cookies = response.headers.getSetCookie();
    response.headers.forEach((value, key) => {
      if (key !== "set-cookie") res.setHeader(key, value);
    });
    if (cookies.length) res.setHeader("set-cookie", cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("port");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

describe("pack HTTP API", () => {
  let server: Server;
  let origin: string;
  const fetches: string[] = [];
  const logs: Array<Record<string, unknown>> = [];
  let onDeps: Partial<AppDeps>;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), "adverity-"));
    onDeps = {
      env: {
        FEATURE_REVIEW_READY_AD_PACK: "true",
        ADVERITY_DB: join(dir, "app.sqlite"),
        ADVERITY_PILOT_PASSPHRASE: passphrase,
        MODEL_ADAPTER: "fixture",
        EVIDENCE_MODE: "fixture",
        ADVERITY_PACK_RATE_LIMIT: "8",
        NODE_ENV: "test",
      },
      resolveHost: async () => ["93.184.216.34"],
      fetchImpl: async (input) => {
        fetches.push(String(input));
        throw new Error("network disabled");
      },
      log: (event) => logs.push(event),
    };
    setTestDeps(onDeps);
    ({ server, origin } = await listen());
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    setTestDeps(null);
  });

  async function login(username: string): Promise<Session> {
    const response = await fetch(`${origin}/api/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, passphrase }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { csrf: string };
    const cookie = response.headers.getSetCookie()[0]?.split(";")[0];
    if (!cookie) throw new Error("missing cookie");
    return { cookie, csrf: body.csrf };
  }

  function authed(session: Session): HeadersInit {
    return { cookie: session.cookie, "content-type": "application/json", "x-adverity-csrf": session.csrf };
  }

  const sample = {
    productUrl: "https://healthcrew.ai/",
    destinationUrl: "https://healthcrew.ai/",
    brief: "Illustrative UK English pack. Not a customer claim.",
    advertiser: "HealthCrew.ai",
    userType: "freelance",
    objective: "Platform discovery",
    audience: "Healthcare staffing-agency owners",
    adGroup: "healthcare recruitment software",
    keywordThemes: ["healthcare recruitment software"],
    locale: "en-GB",
    offerSummary: "Design-partner conversation",
  };

  it("serves a burst of flag reads (load smoke)", async () => {
    const responses = await Promise.all(Array.from({ length: 20 }, () => fetch(`${origin}/api/feature-flags`)));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    await Promise.all(responses.map((response) => response.text()));
  });

  it("keeps flag-off requests free of side effects (N0b, G9)", async () => {
    setTestDeps({
      env: {
        FEATURE_REVIEW_READY_AD_PACK: "false",
        ADVERITY_DB: join(mkdtempSync(join(tmpdir(), "adverity-off-")), "off.sqlite"),
        ADVERITY_PILOT_PASSPHRASE: passphrase,
      },
      fetchImpl: async () => {
        throw new Error("should not fetch");
      },
    });
    try {
      const flags = await handleRequest(new Request("http://internal/api/feature-flags"));
      expect(await flags.json()).toEqual({ review_ready_ad_pack: false });
      const created = await handleRequest(new Request("http://internal/api/packs", { method: "POST", body: "{}" }));
      expect(created.status).toBe(404);
    } finally {
      setTestDeps(onDeps);
    }
  });

  it("approves one exact version and refuses the edited one (R1, R10–R16, R21–R23)", async () => {
    const practitioner = await login("practitioner");
    const denied = await fetch(`${origin}/api/packs`, { method: "POST", headers: { cookie: practitioner.cookie, "content-type": "application/json" }, body: JSON.stringify(sample) });
    expect(denied.status).toBe(403);

    const created = await fetch(`${origin}/api/packs`, { method: "POST", headers: authed(practitioner), body: JSON.stringify(sample) });
    expect(created.status).toBe(201);
    const pack = (await created.json()) as PackBody;
    expect(pack.user_type).toBe("freelance");
    expect(pack.advertiser).toBe("HealthCrew.ai");
    expect(pack.audience).toBe("Healthcare staffing-agency owners");
    expect(pack.approver_route).toBe("freelance_external_client");
    expect(pack.playbook_version).toBe("pb-en-gb-1");
    expect(pack.market_packs[0].validation_passed).toBe(true);
    expect(pack.market_packs[0].export_eligible).toBe(false);
    expect(pack.market_packs[0].assets.find((asset) => asset.text === "HealthCrew AI")?.google_count).toBe(13);
    expect(JSON.stringify(pack)).not.toContain(PRIVATE_PLAYBOOK_SENTINEL);
    expect(pack.market_packs[0].assets.some((asset) => asset.text.includes("72 Hrs"))).toBe(false);
    expect(pack.critique_log[0]?.before).toContain("72 Hrs");
    expect(fetches).toHaveLength(0);
    expect(logs.some((event) => event.event === "ad_pack_validated")).toBe(false);

    const commented = await fetch(`${origin}/api/packs/${pack.id}/comments`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ body: "Please confirm the design-partner destination before launch." }),
    });
    const afterComment = (await commented.json()) as PackBody;
    expect(afterComment.market_packs[0].version_id).toBe(pack.market_packs[0].version_id);
    expect(afterComment.market_packs[0].export_eligible).toBe(false);

    const unassigned = await fetch(`${origin}/api/packs/${pack.id}/approvals`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ role: "external_client", confirmOffer: "true", confirmDestination: "true" }),
    });
    expect(unassigned.status).toBe(403);

    expect((await fetch(`${origin}/api/packs/${pack.id}/assignments`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ role: "copy_expert", username: "copy-expert", canAssessLocale: "true" }),
    })).status).toBe(200);
    expect((await fetch(`${origin}/api/packs/${pack.id}/assignments`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ role: "external_client", username: "external-client" }),
    })).status).toBe(200);

    const expert = await login("copy-expert");
    expect((await fetch(`${origin}/api/packs/${pack.id}/approvals`, {
      method: "POST",
      headers: authed(expert),
      body: JSON.stringify({ role: "copy_expert" }),
    })).status).toBe(200);

    const client = await login("external-client");
    const missingConfirm = await fetch(`${origin}/api/packs/${pack.id}/approvals`, {
      method: "POST",
      headers: authed(client),
      body: JSON.stringify({ role: "external_client" }),
    });
    expect(missingConfirm.status).toBe(400);
    const approved = await fetch(`${origin}/api/packs/${pack.id}/approvals`, {
      method: "POST",
      headers: authed(client),
      body: JSON.stringify({ role: "external_client", confirmOffer: "true", confirmDestination: "true" }),
    });
    const ready = (await approved.json()) as PackBody;
    expect(ready.market_packs[0].export_eligible).toBe(true);
    expect(ready.status).toBe("export_eligible");

    const exported = await fetch(`${origin}/api/packs/${pack.id}/export`, { headers: { cookie: client.cookie } });
    expect(exported.status).toBe(200);
    const csv = await exported.text();
    expect(csv).toContain("Not a tested Google Ads Editor import");
    expect(csv).toContain("Healthcare Hiring Platform");

    const revised = await fetch(`${origin}/api/packs/${pack.id}/revisions`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ kind: "headline", position: 1, text: "A manually edited headline line" }),
    });
    const edited = (await revised.json()) as PackBody;
    expect(edited.market_packs[0].version_number).toBe(2);
    expect(edited.market_packs[0].export_eligible).toBe(false);
    expect((await fetch(`${origin}/api/packs/${pack.id}/export`, { headers: { cookie: client.cookie } })).status).toBe(409);

    const consent = await fetch(`${origin}/api/consent`, { method: "POST", headers: authed(practitioner), body: "{}" });
    expect(consent.status).toBe(200);
    const second = await fetch(`${origin}/api/packs`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ ...sample, userType: "in_house" }),
    });
    expect(second.status).toBe(201);
    expect(logs.some((event) => event.event === "ad_pack_validated")).toBe(true);

    const blocked = await fetch(`${origin}/api/packs`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ ...sample, productUrl: "http://169.254.169.254/latest" }),
    });
    const refused = (await blocked.json()) as PackBody;
    expect(refused.status).toBe("needs_input");
    expect(fetches).toHaveLength(0);

    const stranger = await login("language-reviewer");
    expect((await fetch(`${origin}/api/packs/${pack.id}/export`, { headers: { cookie: stranger.cookie } })).status).toBe(403);

    const signedOut = await fetch(`${origin}/api/sign-out`, { method: "POST", headers: authed(practitioner), redirect: "manual" });
    expect(signedOut.status).toBe(303);
    expect((await fetch(`${origin}/api/packs/${pack.id}`, { headers: { cookie: practitioner.cookie } })).status).toBe(401);
  });

  it("records role overlap and keeps the in-house route distinct (R11, R12)", async () => {
    const practitioner = await login("practitioner");
    const created = await fetch(`${origin}/api/packs`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ ...sample, userType: "in_house" }),
    });
    const pack = (await created.json()) as PackBody;
    const overlap = (await (await fetch(`${origin}/api/packs/${pack.id}/assignments`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ role: "copy_expert", username: "practitioner" }),
    })).json()) as PackBody;
    expect(overlap.market_packs[0].roles_overlap).toBe(true);
    expect(overlap.market_packs[0].independent_review).toBe(false);

    const wrongRoute = await fetch(`${origin}/api/packs/${pack.id}/assignments`, {
      method: "POST",
      headers: authed(practitioner),
      body: JSON.stringify({ role: "external_client", username: "external-client" }),
    });
    expect(wrongRoute.status).toBe(200);
    const client = await login("external-client");
    const rejected = await fetch(`${origin}/api/packs/${pack.id}/approvals`, {
      method: "POST",
      headers: authed(client),
      body: JSON.stringify({ role: "external_client", confirmOffer: "true", confirmDestination: "true" }),
    });
    expect(rejected.status).toBe(403);
  });
});
