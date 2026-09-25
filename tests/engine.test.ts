import { describe, expect, it } from 'vitest';
import { evaluateSignal } from '../src/engine';
import { initialState, scenarioSignal } from '../src/scenarios';

describe('RealityShift adaptive engine', () => {
  it('replans supplier scenario only after a trusted contradiction', () => {
    const result = evaluateSignal(initialState('supplier'), scenarioSignal('supplier'));
    expect(result.reasonCode).toBe('ADAPT');
    expect(result.state.planVersion).toBe(2);
    expect(result.state.metric.invalidated).toBe(1);
    expect(result.state.adaptiveOutcome).toContain('$18,260');
    expect(result.state.revisions[0].preserved).toEqual(expect.arrayContaining(['Budget preserved', 'Deadline preserved']));
  });

  it('blocks an unsafe stale-replica failover', () => {
    const result = evaluateSignal(initialState('replica'), scenarioSignal('replica'));
    expect(result.reasonCode).toBe('ADAPT');
    expect(result.state.planVersion).toBe(2);
    expect(result.state.adaptivePlan.some((step) => step.label === 'Block stale failover')).toBe(true);
    expect(result.state.metric.unsafeBlocked).toBe(1);
  });

  it('contains low-trust contradictory evidence without changing the plan', () => {
    const result = evaluateSignal(initialState('poisoned'), scenarioSignal('poisoned'));
    expect(result.reasonCode).toBe('HOLD_VERIFY');
    expect(result.state.planVersion).toBe(1);
    expect(result.state.containment).toContain('0.80');
    expect(result.state.metric.unsafeBlocked).toBe(1);
  });

  it('is idempotent when the same event is delivered twice', () => {
    const first = evaluateSignal(initialState('supplier'), scenarioSignal('supplier'));
    const second = evaluateSignal(first.state, scenarioSignal('supplier'));
    expect(second.reasonCode).toBe('NO_CHANGE');
    expect(second.state.planVersion).toBe(2);
    expect(second.state.events).toHaveLength(1);
    expect(second.state.revisions).toHaveLength(1);
  });
});
