const ALLOWED_HOST_SUFFIXES = [
  "betterseqta.org",
  "accounts.betterseqta.org",
  "raw.githubusercontent.com",
  "github.com",
] as const;

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isNamedLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "127.0.0.1" ||
    host.startsWith("127.") ||
    host === "::1" ||
    host === "0.0.0.0"
  );
}

function isPrivateIpv4(host: string): boolean {
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return a === 127 || a === 0;
}

function isPrivateIpv6(host: string): boolean {
  if (!host.includes(":")) return false;
  const h = host.split("%")[0];
  return h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd");
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  return isNamedLocalHost(host) || isPrivateIpv4(host) || isPrivateIpv6(host);
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/** HTTPS-only fetch allowlist for background `fetchFromUrl`. */
export function isAllowedFetchUrl(urlString: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (isPrivateOrLocalHost(parsed.hostname)) return false;
  return isAllowedHost(parsed.hostname);
}
