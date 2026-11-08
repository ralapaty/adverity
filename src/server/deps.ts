import { lookup } from "node:dns/promises";
import { createFixtureModel } from "../adapters/fixture-model";
import { createHttpModel } from "../adapters/http-model";
import type { ModelAdapter } from "../domain/pipeline";
import { fetchPublicExcerpt } from "../evidence/fetch";
import { getDb, resetDb, type Env } from "../db/db";

export type AppDeps = {
  env: Env;
  fetchImpl: typeof fetch;
  resolveHost: (host: string) => Promise<string[]>;
  fetchExcerpt: typeof fetchPublicExcerpt;
  adapter: ModelAdapter;
  log: (event: Record<string, unknown>) => void;
};

let overrides: Partial<AppDeps> | null = null;

export function setTestDeps(next: Partial<AppDeps> | null): void {
  overrides = next;
  resetDb();
}

async function defaultResolve(host: string): Promise<string[]> {
  const results = await lookup(host, { all: true, verbatim: true });
  return results.map((item) => item.address);
}

export function appDeps(): AppDeps {
  const env = { ...process.env, ...(overrides?.env ?? {}) } as Env;
  const fetchImpl = overrides?.fetchImpl ?? fetch;
  const adapter = overrides?.adapter ?? (env.MODEL_ADAPTER === "fixture" ? createFixtureModel() : createHttpModel(env, fetchImpl));
  return {
    env,
    fetchImpl,
    resolveHost: overrides?.resolveHost ?? defaultResolve,
    fetchExcerpt: overrides?.fetchExcerpt ?? fetchPublicExcerpt,
    adapter,
    log: overrides?.log ?? ((event) => console.log(JSON.stringify(event))),
  };
}

export function database() {
  const deps = appDeps();
  return getDb(deps.env.ADVERITY_DB || "./data/adverity.sqlite", deps.env.ADVERITY_PILOT_PASSPHRASE);
}
