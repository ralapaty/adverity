import { isIP } from "node:net";
import { classifyUrl, isNonPublicAddress } from "../domain/url-guard";

const MAX_BYTES = 1_048_576;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

export const HEALTHCREW_FIXTURE_EXCERPT =
  "HealthCrew is a healthcare technology platform for recruitment teams. It is not a staffing agency. Alpha and design-partner availability must be confirmed before they are advertised.";

export type FetchDeps = {
  resolveHost: (host: string) => Promise<string[]>;
  fetchImpl: typeof fetch;
  evidenceMode?: string;
};

function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

async function readLimited(response: Response): Promise<{ ok: true; text: string } | { ok: false; reason: "size" }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > MAX_BYTES) return { ok: false, reason: "size" };
    return { ok: true, text };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return { ok: false, reason: "size" };
    }
    chunks.push(value);
  }
  return { ok: true, text: new TextDecoder().decode(Buffer.concat(chunks)) };
}

export async function fetchPublicExcerpt(
  raw: string,
  deps: FetchDeps,
): Promise<{ ok: true; excerpt: string; sourceUrl: string } | { ok: false; reason: string }> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const guarded = await classifyUrl(current, deps.resolveHost);
    if (!guarded.ok) return { ok: false, reason: guarded.reason };
    if (!isIP(guarded.url.hostname)) {
      let again: string[] = [];
      try {
        again = await deps.resolveHost(guarded.url.hostname);
      } catch {
        return { ok: false, reason: "dns" };
      }
      if (again.length === 0 || again.some((address) => isNonPublicAddress(address))) {
        return { ok: false, reason: "private" };
      }
    }
    if (deps.evidenceMode === "fixture" && guarded.url.hostname === "healthcrew.ai") {
      return { ok: true, excerpt: HEALTHCREW_FIXTURE_EXCERPT, sourceUrl: guarded.url.toString() };
    }
    let response: Response;
    try {
      response = await deps.fetchImpl(guarded.url.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "text/html,text/plain" },
      });
    } catch {
      return { ok: false, reason: "timeout" };
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) return { ok: false, reason: "redirect" };
      current = new URL(location, guarded.url).toString();
      continue;
    }
    if (!response.ok) return { ok: false, reason: "http" };
    const body = await readLimited(response);
    if (!body.ok) return body;
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("text/plain")) return { ok: false, reason: "type" };
    const excerpt = toText(body.text);
    if (!excerpt) return { ok: false, reason: "empty" };
    return { ok: true, excerpt, sourceUrl: guarded.url.toString() };
  }
  return { ok: false, reason: "redirect" };
}
