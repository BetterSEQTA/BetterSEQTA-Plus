/**
 * Shared helpers for ensure-ripgrep (unit-tested).
 */
export function getRipgrepInstallTarget(devDependencies) {
  const spec = devDependencies?.['@vscode/ripgrep'];
  return spec ? `@vscode/ripgrep@${spec}` : '@vscode/ripgrep';
}
