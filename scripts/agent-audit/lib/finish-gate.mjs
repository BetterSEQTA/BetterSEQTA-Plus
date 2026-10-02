export function resolveMinFinishTurns(minTurns) {
  const raw = process.env.AGENT_AUDIT_MIN_FINISH_TURNS;
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Math.max(minTurns + 15, 40);
}

/**
 * Decide whether to accept a finish report this turn.
 */
export function evaluateFinishGate({
  turnIndex,
  minTurns,
  minFinishTurns,
  mode,
  report,
  tooling
}) {
  const turn = turnIndex + 1;

  if (turn < minTurns) {
    return {
      accept: false,
      userMessage: `Finish rejected at turn ${turn}. Minimum ${minTurns} tool turns required. Continue with read_file and grep.`
    };
  }

  if (turn < minFinishTurns) {
    return {
      accept: false,
      userMessage: `Finish rejected at turn ${turn}. Minimum finish depth is ${minFinishTurns} tool turns. Keep auditing auth, isolation, guest/public surfaces, cookies, and outbound calls.`
    };
  }

  if (tooling?.grepBroken) {
    return {
      accept: false,
      userMessage: `Finish rejected: grep failed (${tooling.grepErrorDetail || 'ripgrep error'}). Use read_file on specific paths. Document tooling problems in limitations before finishing.`
    };
  }

  if (tooling?.grepSanityFailed) {
    return {
      accept: false,
      userMessage:
        'Finish rejected: repo sanity grep returned no matches (ripgrep may be misconfigured). Use read_file on critical paths and document tooling limits in limitations.'
    };
  }

  if (mode === 'security') {
    const findings = report?.findings;
    const empty = !Array.isArray(findings) || findings.length === 0;
    const limitations = report?.limitations;
    const hasLimitations =
      Array.isArray(limitations) && limitations.some((line) => String(line).trim().length > 24);
    if (empty && !hasLimitations && turn < minFinishTurns + 15) {
      return {
        accept: false,
        userMessage:
          'Finish rejected: findings array is empty but limitations do not explain unchecked areas. Record findings or list unchecked areas in limitations.'
      };
    }
  }

  return { accept: true };
}
