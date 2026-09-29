const {
  CANONICAL_REPOSITORY,
  isForkAuditAllowed,
  assertAgentAuditRepositoryAllowed
} = require('./repo-gate.cjs');

describe('repo-gate', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('exports canonical repository slug', () => {
    expect(CANONICAL_REPOSITORY).toBe('BetterSEQTA/BetterSEQTA-Plus');
  });

  it('isForkAuditAllowed reads env', () => {
    delete process.env.AGENT_AUDIT_ALLOW_FORKS;
    expect(isForkAuditAllowed()).toBe(false);
    process.env.AGENT_AUDIT_ALLOW_FORKS = 'true';
    expect(isForkAuditAllowed()).toBe(true);
    process.env.AGENT_AUDIT_ALLOW_FORKS = '1';
    expect(isForkAuditAllowed()).toBe(true);
  });

  it('assertAgentAuditRepositoryAllowed allows canonical repo', () => {
    process.env.GITHUB_REPOSITORY = CANONICAL_REPOSITORY;
    expect(assertAgentAuditRepositoryAllowed()).toBe(true);
  });

  it('assertAgentAuditRepositoryAllowed allows fork when env set', () => {
    process.env.GITHUB_REPOSITORY = 'someone/BetterSEQTA-Plus';
    process.env.AGENT_AUDIT_ALLOW_FORKS = 'true';
    expect(assertAgentAuditRepositoryAllowed()).toBe(true);
  });
});
