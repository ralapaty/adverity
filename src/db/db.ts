import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS actor (
  id TEXT PRIMARY KEY,
  passphrase_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS consent (
  actor_id TEXT PRIMARY KEY,
  granted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pack (
  id TEXT PRIMARY KEY,
  advertiser TEXT NOT NULL,
  user_type TEXT NOT NULL,
  audience TEXT NOT NULL,
  objective TEXT NOT NULL,
  ad_group TEXT NOT NULL,
  locale TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  offer_summary TEXT NOT NULL,
  product_url TEXT NOT NULL,
  brief TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  offer_confirmed INTEGER NOT NULL DEFAULT 0,
  destination_confirmed INTEGER NOT NULL DEFAULT 0,
  roles_overlap INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS pack_version (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content_hash TEXT,
  playbook_version_id TEXT,
  validation_passed INTEGER NOT NULL,
  incomplete INTEGER NOT NULL,
  language_review_required INTEGER NOT NULL,
  adapter_id TEXT,
  model_id TEXT,
  status TEXT NOT NULL,
  limitations_json TEXT NOT NULL,
  assumptions_json TEXT NOT NULL,
  intent_json TEXT NOT NULL,
  critique_json TEXT NOT NULL,
  model_calls INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS asset (
  id TEXT PRIMARY KEY,
  pack_version_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  angle TEXT NOT NULL,
  google_count INTEGER,
  flags_json TEXT NOT NULL,
  evidence_ids_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence_excerpt (
  id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (id, pack_id)
);
CREATE TABLE IF NOT EXISTS role_assignment (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  role TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  can_assess_locale INTEGER NOT NULL DEFAULT 1,
  UNIQUE (pack_id, role)
);
CREATE TABLE IF NOT EXISTS approval (
  id TEXT PRIMARY KEY,
  pack_version_id TEXT NOT NULL,
  role TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS comment (
  id TEXT PRIMARY KEY,
  pack_version_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_event (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  event TEXT NOT NULL,
  pack_id TEXT,
  version_id TEXT,
  actor_id TEXT,
  detail_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS export_attempt (
  id TEXT PRIMARY KEY,
  pack_version_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  allowed INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_bucket (
  actor_id TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (actor_id, window_start)
);
`;

export type Env = Record<string, string | undefined>;

let current: { path: string; db: DatabaseSync } | null = null;

export function resetDb(): void {
  current?.db.close();
  current = null;
}

export function hashPassphrase(passphrase: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(passphrase, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassphrase(passphrase: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(passphrase, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

const ACTORS = ["practitioner", "copy-expert", "external-client", "internal-owner", "language-reviewer"];

function seed(db: DatabaseSync, passphrase: string | undefined): void {
  const row = db.prepare("SELECT COUNT(*) AS n FROM actor").get() as { n: number };
  if (row.n > 0 || !passphrase) return;
  const insert = db.prepare("INSERT INTO actor (id, passphrase_hash) VALUES (?, ?)");
  for (const actor of ACTORS) insert.run(actor, hashPassphrase(passphrase));
}

export function getDb(path: string, passphrase?: string): DatabaseSync {
  if (current?.path === path) return current.db;
  current?.db.close();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  seed(db, passphrase);
  current = { path, db };
  return db;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}
