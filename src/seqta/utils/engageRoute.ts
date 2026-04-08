/**
 * Learn-style hash routes on Engage: `#?page=/home` → `"home"`.
 * Falls back to the legacy path segment used by classic Learn routing.
 */
export function getEngageRoutePage(): string | undefined {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const qs = hash.startsWith("?") ? hash : `?${hash}`;
    const params = new URLSearchParams(qs);
    const page = params.get("page");
    if (page?.startsWith("/")) {
      const segment = page.replace(/^\//, "").split("/")[0];
      return segment || undefined;
    }
  }
  return window.location.href.split("/")[4];
}
