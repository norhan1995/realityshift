import type { EngineResult, RunState, Signal } from './types';

const EVIDENCE_THRESHOLD = 0.8;

function supplierAdapt(state: RunState, signal: Signal): RunState {
  return {
    ...state,
    phase: 'adapted safely',
    planVersion: 2,
    worldFacts: ['Atlas stock: 120 units', 'Nova stock: 420 units', 'Split order cost: $18,260'],
    assumptions: state.assumptions.map((item) => item.id === 'a1'
      ? { ...item, actual: '120', status: 'invalid' as const }
      : item.id === 'a3'
        ? { ...item, actual: '$18,260', status: 'valid' as const }
        : item),
    adaptivePlan: [
      { id: 's1', label: 'Validate demand', detail: '500 units confirmed', status: 'done' },
      { id: 's2', label: 'Reserve Atlas remainder', detail: 'Use available 120 units', status: 'changed' },
      { id: 's3', label: 'Reserve Nova fallback', detail: 'Add 380 certified units', status: 'changed' },
      { id: 's4', label: 'Merge carrier pickup', detail: 'Keep Friday delivery', status: 'active' }
    ],
    baselinePlan: [
      { id: 'b1', label: 'Validate demand', detail: '500 units confirmed', status: 'done' },
      { id: 'b2', label: 'Reserve Atlas inventory', detail: 'Still attempts 500 units', status: 'danger' },
      { id: 'b3', label: 'Book certified carrier', detail: 'Books against missing stock', status: 'danger' },
      { id: 'b4', label: 'Confirm Friday delivery', detail: 'Silent fulfillment failure', status: 'danger' }
    ],
    events: [...state.events, { ...signal, decision: 'REPLAN → v2' }],
    revisions: [...state.revisions, {
      version: 2,
      because: 'Atlas no longer has enough stock to satisfy the plan precondition. I preserved the Friday deadline, certification rule and budget by splitting the order across Atlas and Nova.',
      invalidated: ['Atlas stock ≥ 500 — invalidated'],
      preserved: ['Budget preserved', 'Deadline preserved', 'Certification preserved'],
      before: ['Reserve 500 from Atlas', 'Book one carrier pickup'],
      after: ['Reserve 120 from Atlas', 'Reserve 380 from Nova', 'Merge certified pickup'],
      safety: 'Revision accepted: all immutable mission constraints still pass.'
    }],
    baselineOutcome: 'Would reserve 380 units that no longer exist and fail fulfillment.',
    adaptiveOutcome: '500 units still arrive by Friday for $18,260.',
    metric: { invalidated: 1, preserved: 3, revisions: 1, unsafeBlocked: 0 }
  };
}

function replicaAdapt(state: RunState, signal: Signal): RunState {
  return {
    ...state,
    phase: 'adapted safely',
    planVersion: 2,
    worldFacts: ['Primary p95 latency: 920ms', 'Replica lag: 18 minutes', 'Write throttle available'],
    assumptions: state.assumptions.map((item) => item.id === 'r1'
      ? { ...item, actual: '18m', status: 'invalid' as const }
      : item.id === 'r3'
        ? { ...item, actual: '18m exposure', status: 'invalid' as const }
        : item),
    adaptivePlan: [
      { id: 's1', label: 'Confirm latency incident', detail: 'p95 > 800ms', status: 'done' },
      { id: 's2', label: 'Block stale failover', detail: 'Replica violates RPO', status: 'changed' },
      { id: 's3', label: 'Throttle noncritical writes', detail: 'Reduce primary pressure', status: 'active' },
      { id: 's4', label: 'Catch up replica + escalate', detail: 'Human approves later failover', status: 'queued' }
    ],
    baselinePlan: [
      { id: 'b1', label: 'Confirm latency incident', detail: 'p95 > 800ms', status: 'done' },
      { id: 'b2', label: 'Use stale freshness check', detail: 'Still trusts old 18s reading', status: 'danger' },
      { id: 'b3', label: 'Fail over to replica', detail: 'Promotes 18-minute stale copy', status: 'danger' },
      { id: 'b4', label: 'Verify recovery', detail: 'Potential data-loss incident', status: 'danger' }
    ],
    events: [...state.events, { ...signal, decision: 'REPLAN → v2' }],
    revisions: [...state.revisions, {
      version: 2,
      because: 'The replica freshness assumption became false before failover. Promoting it would violate the 60-second recovery objective, so I blocked failover and switched to a reversible pressure-reduction plan.',
      invalidated: ['Replica lag ≤ 60s — invalidated', 'Failover preserves RPO — invalidated'],
      preserved: ['RPO protected', 'No unverified failover', 'Service recovery mission preserved'],
      before: ['Promote replica', 'Route writes to replica'],
      after: ['Block failover', 'Throttle noncritical writes', 'Catch up replica', 'Escalate before promotion'],
      safety: 'Revision accepted: avoids irreversible data loss while keeping recovery work active.'
    }],
    baselineOutcome: 'Would promote an 18-minute stale replica and risk data loss.',
    adaptiveOutcome: 'Unsafe failover blocked; service pressure reduced while replica catches up.',
    metric: { invalidated: 2, preserved: 3, revisions: 1, unsafeBlocked: 1 }
  };
}

function containPoisoned(state: RunState, signal: Signal): RunState {
  return {
    ...state,
    phase: 'adaptation contained',
    worldFacts: ['Signed inventory API: Atlas 500', 'Forwarded email: Atlas 0', 'Evidence conflict detected'],
    assumptions: state.assumptions.map((item) => item.id === 'a1'
      ? { ...item, actual: '500 authoritative / 0 untrusted', status: 'uncertain' as const }
      : item),
    events: [...state.events, { ...signal, decision: 'HOLD + VERIFY' }],
    adaptiveOutcome: 'Plan v1 held until trustworthy evidence resolves the conflict.',
    containment: 'The signal contradicts the plan, but trust 0.42 is below the 0.80 adaptation threshold and conflicts with authoritative evidence. RealityShift refuses to rewrite the plan, records the anomaly, and requests verification.',
    metric: { invalidated: 0, preserved: 3, revisions: 0, unsafeBlocked: 1 }
  };
}

export function evaluateSignal(state: RunState, signal: Signal): EngineResult {
  if (state.events.some((event) => event.id === signal.id)) {
    return { state, adapted: false, contained: false, reasonCode: 'NO_CHANGE' };
  }

  if (signal.scenario === 'poisoned' || signal.trust < EVIDENCE_THRESHOLD) {
    return { state: containPoisoned(state, signal), adapted: false, contained: true, reasonCode: 'HOLD_VERIFY' };
  }

  if (signal.scenario === 'replica') {
    return { state: replicaAdapt(state, signal), adapted: true, contained: false, reasonCode: 'ADAPT' };
  }

  return { state: supplierAdapt(state, signal), adapted: true, contained: false, reasonCode: 'ADAPT' };
}

export const evidenceThreshold = EVIDENCE_THRESHOLD;
