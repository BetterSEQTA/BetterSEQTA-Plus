import { readScratch } from './scratch-pad.mjs';

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
function scratchChecklistOk(scratchDir) {
  if (!scratchDir) return false;
  const r = readScratch(scratchDir, { name: 'checklist' });
  if (r.error || !r.content) return false;
  const text = String(r.content);
  return text.trim().length > 40 && /(\[x\]|status:\s*checked|checked\s*-\s*)/i.test(text);
}

export function evaluateFinishGate({
  turnIndex,
  minTurns,
  minFinishTurns,
  mode,
  report,
  tooling,
  scratchDir = null
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
      userMessage: `Finish rejected at turn ${turn}. Minimum finish depth is ${minFinishTurns} tool turns. Keep auditing manifest permissions, content scripts, message passing, storage, OAuth, and HTML injection paths.`
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
      if (!scratchChecklistOk(scratchDir)) {
        return {
          accept: false,
          userMessage:
            'Finish rejected: empty findings with shallow depth. write_scratch name checklist with each focus area marked checked or skipped-with-reason, or add detailed limitations.'
        };
      }
    }
  }

  return { accept: true };
}
