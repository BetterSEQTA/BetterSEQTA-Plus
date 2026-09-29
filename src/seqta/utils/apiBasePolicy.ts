export const PRODUCTION_API_BASE = "https://betterseqta.org";

/**
 * Resolves the content API host. Extension dev builds always use production
 * so community theme submit and the theme store work against the live API.
 */
export function resolveApiBase(
  buildMode: "development" | "production",
  sessionOverride: string | null,
): string {
  if (buildMode === "development") return PRODUCTION_API_BASE;
  if (sessionOverride) return sessionOverride;
  return PRODUCTION_API_BASE;
}
