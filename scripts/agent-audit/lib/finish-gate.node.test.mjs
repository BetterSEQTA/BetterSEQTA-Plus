import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFinishGate, resolveMinFinishTurns } from './finish-gate.mjs';

describe('finish-gate', () => {
  it('resolveMinFinishTurns defaults to at least 40', () => {
    delete process.env.AGENT_AUDIT_MIN_FINISH_TURNS;
    assert.equal(resolveMinFinishTurns(25), 40);
    assert.equal(resolveMinFinishTurns(50), 65);
  });

  it('resolveMinFinishTurns respects env', () => {
    process.env.AGENT_AUDIT_MIN_FINISH_TURNS = '55';
    assert.equal(resolveMinFinishTurns(25), 55);
    delete process.env.AGENT_AUDIT_MIN_FINISH_TURNS;
  });

  it('rejects finish before minTurns', () => {
    const gate = evaluateFinishGate({
      turnIndex: 20,
      minTurns: 25,
      minFinishTurns: 40,
      mode: 'security',
      report: { findings: [] },
      tooling: {}
    });
    assert.equal(gate.accept, false);
  });

  it('rejects shallow clean sweep before depth plus buffer', () => {
    const shallow = evaluateFinishGate({
      turnIndex: 44,
      minTurns: 25,
      minFinishTurns: 40,
      mode: 'security',
      report: { findings: [], limitations: [] },
      tooling: {}
    });
    assert.equal(shallow.accept, false);
    const deepEnough = evaluateFinishGate({
      turnIndex: 54,
      minTurns: 25,
      minFinishTurns: 40,
      mode: 'security',
      report: {
        findings: [],
        limitations: ['Did not review every route handler; focused on auth and host isolation.']
      },
      tooling: {}
    });
    assert.equal(deepEnough.accept, true);
  });

  it('rejects when grep sanity failed', () => {
    const gate = evaluateFinishGate({
      turnIndex: 49,
      minTurns: 25,
      minFinishTurns: 40,
      mode: 'security',
      report: { findings: [{ id: 'F1' }], limitations: ['ok'] },
      tooling: { grepSanityFailed: true }
    });
    assert.equal(gate.accept, false);
  });
});
