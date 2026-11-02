'use strict';

/** Canonical GitHub repo that runs scheduled agent audits by default. */
const CANONICAL_REPOSITORY = 'BetterSEQTA/BetterSEQTA-Plus';

function isForkAuditAllowed() {
  const v = String(process.env.AGENT_AUDIT_ALLOW_FORKS || '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * Exit 0 when audit should not run on this fork (CI should skip without failure).
 * @returns {boolean} true if caller should continue
 */
function assertAgentAuditRepositoryAllowed() {
  const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
  if (!repo) return true;
  if (repo === CANONICAL_REPOSITORY) return true;
  if (isForkAuditAllowed()) return true;
  console.log(
    `[audit] Skipping agent audit on ${repo}. Set repository variable AGENT_AUDIT_ALLOW_FORKS=true or env AGENT_AUDIT_ALLOW_FORKS=1 to run on forks.`
  );
  process.exit(0);
  return false;
}

module.exports = {
  CANONICAL_REPOSITORY,
  isForkAuditAllowed,
  assertAgentAuditRepositoryAllowed
};
