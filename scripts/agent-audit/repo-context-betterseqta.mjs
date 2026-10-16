import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

export function buildRepoIndex(repoRoot) {
  const manifestPath = path.join(repoRoot, 'src', 'manifests', 'manifest.json');
  let manifestSummary = null;
  if (fs.existsSync(manifestPath)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifestSummary = {
        permissions: m.permissions || [],
        hostPermissionsCount: (m.host_permissions || []).length,
        contentScriptMatches: (m.content_scripts || [])
          .flatMap((cs) => cs.matches || [])
          .slice(0, 15)
      };
    } catch {
      manifestSummary = { parseError: true };
    }
  }

  const fileTreeDigest = {
    manifests: globSync('src/manifests/*', { cwd: repoRoot }).map((p) => p.replace(/\\/g, '/')),
    background: fs.existsSync(path.join(repoRoot, 'src', 'background.ts')) ? ['src/background.ts'] : [],
    contentScripts: globSync('src/content/**/*.{ts,js,svelte}', { cwd: repoRoot })
      .slice(0, 40)
      .map((p) => p.replace(/\\/g, '/'))
  };

  const auditChecklist = [
    { area: 'MV3 trust boundary', entryFiles: ['src/manifests/manifest.json', 'src/background.ts'] },
    { area: 'Message passing', entryFiles: ['src/background.ts', 'src/content'] },
    { area: 'HTML injection / stringToHTML', entryFiles: ['src/seqta/utils/stringToHTML.ts'] },
    { area: 'OAuth and cloud API', entryFiles: ['src/seqta/utils/DevApiBase.ts'] },
    { area: 'CI and release', entryFiles: ['.github/workflows/pr-ci.yml', '.github/workflows/release.yml'] }
  ];

  return { manifestSummary, fileTreeDigest, auditChecklist };
}
