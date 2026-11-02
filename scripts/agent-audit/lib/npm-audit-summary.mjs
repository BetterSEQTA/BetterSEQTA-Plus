import { spawnSync } from 'child_process';

export function npmAuditSummary(repoRoot) {
  const result = spawnSync('npm', ['audit', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  });
  try {
    const data = JSON.parse(result.stdout || '{}');
    const meta = data.metadata?.vulnerabilities || {};
    const advisories = data.advisories || data.vulnerabilities || {};
    const sample = [];
    const entries = typeof advisories === 'object' ? Object.values(advisories) : [];
    for (const adv of entries.slice(0, 12)) {
      if (!adv || typeof adv !== 'object') continue;
      sample.push({
        name: adv.name || adv.module_name || adv.dependency || 'unknown',
        severity: adv.severity || adv.type || 'unknown',
        title: String(adv.title || adv.overview || '').slice(0, 120),
        via: adv.via?.[0]?.name || adv.range || null
      });
      if (sample.length >= 10) break;
    }
    return {
      ok: result.status === 0,
      exitCode: result.status,
      vulnerabilities: meta,
      advisoriesSample: sample
    };
  } catch {
    return { ok: false, parseError: true, stderr: (result.stderr || '').slice(0, 500) };
  }
}
