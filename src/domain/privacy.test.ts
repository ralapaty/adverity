import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../../middleware";
import { getDb, resetDb } from "../db/db";
import { purgeExpiredPacks } from "../server/privacy-store";
import { clientAddress, hstsValue, retentionCutoff, retentionDays, signInBlocked } from "./privacy";

describe("privacy controls (R1, R2, R6)", () => {
  it("blocks the ninth failure inside fifteen minutes and ignores older ones", () => {
    const now = 1_700_000_000_000;
    const recent = Array.from({ length: 8 }, () => now - 1000);
    expect(signInBlocked(recent, now)).toBe(true);
    expect(signInBlocked(recent.slice(0, 7), now)).toBe(false);
    const stale = Array.from({ length: 8 }, () => now - 16 * 60 * 1000);
    expect(signInBlocked(stale, now)).toBe(false);
  });

  it("sends HSTS only in production, for at least six months", () => {
    expect(hstsValue({ NODE_ENV: "production" })).toBe("max-age=15552000");
    expect(hstsValue({ NODE_ENV: "test" })).toBeNull();
    expect(Number(hstsValue({ NODE_ENV: "production" })?.slice("max-age=".length))).toBeGreaterThanOrEqual(60 * 60 * 24 * 180);
  });

  it("keeps packs when retention is 0 and drops packs older than the window", () => {
    expect(retentionDays(undefined)).toBe(90);
    expect(retentionDays("0")).toBe(0);
    expect(retentionCutoff(0, Date.now())).toBeNull();
    const dir = mkdtempSync(join(tmpdir(), "adverity-retain-"));
    resetDb();
    const db = getDb(join(dir, "retain.sqlite"));
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(
      `INSERT INTO pack (id, advertiser, user_type, audience, objective, ad_group, locale, destination_url, offer_summary, product_url, brief, created_by, created_at)
       VALUES ('pack_old', 'Old', 'freelance', 'a', 'o', 'g', 'en-GB', 'https://example.com/', 'offer', 'https://example.com/', 'secret brief', 'practitioner', ?)`,
    ).run(old);
    db.prepare(
      `INSERT INTO pack_version (id, pack_id, version_number, validation_passed, incomplete, language_review_required, status, limitations_json, assumptions_json, intent_json, critique_json, model_calls, elapsed_ms, created_at)
       VALUES ('ver_old', 'pack_old', 1, 1, 0, 0, 'draft', '[]', '[]', '[]', '[]', 0, 0, ?)`,
    ).run(old);
    db.prepare(
      `INSERT INTO asset (id, pack_version_id, kind, position, text, angle, flags_json, evidence_ids_json)
       VALUES ('asset_old', 'ver_old', 'headline', 1, 'secret headline', 'benefit_led', '[]', '[]')`,
    ).run();
    expect(purgeExpiredPacks(db, 1)).toBe(1);
    expect(db.prepare("SELECT id FROM pack").all()).toEqual([]);
    expect(db.prepare("SELECT id FROM asset").all()).toEqual([]);
    resetDb();
  });

  it("sets HSTS on page responses only in production", () => {
    const previous = process.env.NODE_ENV;
    const env = process.env as { NODE_ENV?: string };
    env.NODE_ENV = "production";
    const live = middleware(new NextRequest("http://localhost/"));
    expect(live.headers.get("strict-transport-security")).toBe("max-age=15552000");
    env.NODE_ENV = "test";
    const local = middleware(new NextRequest("http://localhost/"));
    expect(local.headers.get("strict-transport-security")).toBeNull();
    env.NODE_ENV = previous;
  });

  it("uses the first forwarded address and a shared bucket when it is missing", () => {
    expect(clientAddress("203.0.113.8, 10.0.0.1")).toBe("203.0.113.8");
    expect(clientAddress(null)).toBe("unknown");
  });
});
