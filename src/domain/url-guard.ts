import { isIP } from "node:net";

export type GuardFailure = "scheme" | "credentials" | "dns" | "private";

export type GuardResult = { ok: true; url: URL } | { ok: false; reason: GuardFailure };

const BLOCKED_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata.internal",
]);

function mappedIpv4(address: string): string | null {
  if (!address.startsWith("::ffff:")) return null;
  const rest = address.slice("::ffff:".length);
  if (isIP(rest) === 4) return rest;
  const parts = rest.split(":");
  if (parts.length !== 2) return null;
  const hex = parts.map((part) => part.padStart(4, "0")).join("");
  if (!/^[0-9a-f]{8}$/.test(hex)) return null;
  return [0, 2, 4, 6].map((index) => String(Number.parseInt(hex.slice(index, index + 2), 16))).join(".");
}
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

function inCidr(ip: number, base: string, bits: number): boolean {
  const start = ipv4ToInt(base);
  if (start === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ip & mask) === (start & mask);
}

export function isNonPublicAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) {
    const ip = ipv4ToInt(address);
    if (ip === null) return true;
    return (
      inCidr(ip, "0.0.0.0", 8) ||
      inCidr(ip, "10.0.0.0", 8) ||
      inCidr(ip, "127.0.0.0", 8) ||
      inCidr(ip, "100.64.0.0", 10) ||
      inCidr(ip, "169.254.0.0", 16) ||
      inCidr(ip, "172.16.0.0", 12) ||
      inCidr(ip, "192.168.0.0", 16) ||
      inCidr(ip, "192.0.0.0", 24) ||
      inCidr(ip, "192.0.2.0", 24) ||
      inCidr(ip, "198.51.100.0", 24) ||
      inCidr(ip, "203.0.113.0", 24) ||
      inCidr(ip, "224.0.0.0", 4) ||
      inCidr(ip, "240.0.0.0", 4)
    );
  }
  if (kind === 6) {
    const normalised = address.toLowerCase();
    const mapped = mappedIpv4(normalised);
    if (mapped) return isNonPublicAddress(mapped);
    // Other IPv6 literals, including deprecated IPv4-compatible forms, are refused.
    return true;
  }
  return true;
}

export async function classifyUrl(
  raw: string,
  resolveHost: (host: string) => Promise<string[]>,
): Promise<GuardResult> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "scheme" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "scheme" };
  if (url.username || url.password) return { ok: false, reason: "credentials" };
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host)) return { ok: false, reason: "private" };
  if (isIP(host)) {
    return isNonPublicAddress(host) ? { ok: false, reason: "private" } : { ok: true, url };
  }
  let addresses: string[];
  try {
    addresses = await resolveHost(host);
  } catch {
    return { ok: false, reason: "dns" };
  }
  if (addresses.length === 0 || addresses.some((address) => isNonPublicAddress(address))) {
    return { ok: false, reason: "private" };
  }
  return { ok: true, url };
}
