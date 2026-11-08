import type { DatabaseSync } from "node:sqlite";
import { retentionCutoff, SIGN_IN_WINDOW_MS } from "../domain/privacy";
import { newId } from "../db/db";

export function deletePackRows(db: DatabaseSync, packId: string): void {
  const versions = db.prepare("SELECT id FROM pack_version WHERE pack_id = ?").all(packId) as Array<{ id: string }>;
  for (const version of versions) {
    db.prepare("DELETE FROM asset WHERE pack_version_id = ?").run(version.id);
    db.prepare("DELETE FROM comment WHERE pack_version_id = ?").run(version.id);
    db.prepare("DELETE FROM approval WHERE pack_version_id = ?").run(version.id);
    db.prepare("DELETE FROM export_attempt WHERE pack_version_id = ?").run(version.id);
  }
  db.prepare("DELETE FROM pack_version WHERE pack_id = ?").run(packId);
  db.prepare("DELETE FROM evidence_excerpt WHERE pack_id = ?").run(packId);
  db.prepare("DELETE FROM role_assignment WHERE pack_id = ?").run(packId);
  db.prepare("DELETE FROM pack_handoff WHERE pack_id = ?").run(packId);
  db.prepare("DELETE FROM pack WHERE id = ?").run(packId);
}

export function purgeExpiredPacks(db: DatabaseSync, days: number, now = Date.now()): number {
  const cutoff = retentionCutoff(days, now);
  if (!cutoff) return 0;
  const packs = db.prepare("SELECT id FROM pack WHERE created_at < ?").all(cutoff) as Array<{ id: string }>;
  for (const pack of packs) deletePackRows(db, pack.id);
  return packs.length;
}

export function recordSignInFailure(db: DatabaseSync, address: string, now = Date.now()): void {
  db.prepare("INSERT INTO sign_in_failure (id, address, failed_at) VALUES (?, ?, ?)").run(newId("fail"), address, now);
}

export function signInFailureCount(db: DatabaseSync, address: string, now = Date.now()): number {
  const cutoff = now - SIGN_IN_WINDOW_MS;
  const row = db.prepare("SELECT COUNT(*) AS n FROM sign_in_failure WHERE address = ? AND failed_at > ?").get(address, cutoff) as { n: number };
  return row.n;
}

export function actorPacks(db: DatabaseSync, actorId: string): Array<{ id: string; advertiser: string; created_at: string; brief: string; destination_url: string }> {
  return db
    .prepare("SELECT id, advertiser, created_at, brief, destination_url FROM pack WHERE created_by = ? ORDER BY created_at")
    .all(actorId) as Array<{ id: string; advertiser: string; created_at: string; brief: string; destination_url: string }>;
}

export function deleteActorPacks(db: DatabaseSync, actorId: string): number {
  const packs = db.prepare("SELECT id FROM pack WHERE created_by = ?").all(actorId) as Array<{ id: string }>;
  db.exec("BEGIN");
  try {
    for (const pack of packs) deletePackRows(db, pack.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return packs.length;
}
