/** First path segment for SEQTA Teach SPA routes (e.g. betterseqta-home, timetable). */
export function getTeachPathSegment(pathname: string = window.location.pathname): string | undefined {
  const segment = pathname.replace(/^\//, "").split("/")[0];
  return segment || undefined;
}

export function isTeachHomePath(pathname: string = window.location.pathname): boolean {
  return pathname.includes("/betterseqta-home");
}
