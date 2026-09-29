/** Theme API timestamps are Unix seconds. */
export function formatThemeDate(unixSeconds: number | null | undefined): string {
  if (unixSeconds == null || !Number.isFinite(unixSeconds)) return "—";
  return new Date(unixSeconds * 1000).toLocaleDateString();
}
