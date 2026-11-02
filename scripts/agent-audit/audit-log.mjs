/** Timestamped lines for GitHub Actions (stdout is line-buffered in CI). */
export function auditLog(message) {
  const line = `[audit ${new Date().toISOString()}] ${message}`;
  console.log(line);
}
