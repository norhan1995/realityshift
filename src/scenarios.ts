import type { RunState, ScenarioId, Signal } from './types';

export function supplierInitial(): RunState {
  return {
    schemaVersion: 1,
    scenario: 'supplier',
    title: 'Fulfill 500 units by Friday without breaking budget or certification.',
    eyebrow: 'MISSION 01 / SUPPLY FULFILLMENT',
    mission: 'The agent is executing a procurement plan whose next actions depend on Atlas still having enough certified stock.',
    eventLabel: 'Inject inventory webhook',
    eventDescription: 'Atlas inventory changes from 500 available units to 120.',
    sourceLabel: 'Signed inventory webhook · trust 0.98 · event-driven',
    phase: 'executing v1',
    planVersion: 1,
    constraints: ['Budget ≤ $18,500', 'Delivery by Friday', 'Certified suppliers only'],
    worldFacts: ['Atlas stock: 500 units', 'Nova stock: 420 units', 'Atlas $35 / Nova $37 per unit'],
    assumptions: [
      { id: 'a1', label: 'Atlas can cover the full order', expected: 'stock ≥ 500', actual: '500', status: 'valid' },
      { id: 'a2', label: 'Atlas ETA satisfies mission', expected: 'arrival by Thursday', actual: 'Thursday', status: 'valid' },
      { id: 'a3', label: 'Plan cost stays inside budget', expected: '≤ $18,500', actual: '$17,500', status: 'valid' }
    ],
    adaptivePlan: [
      { id: 's1', label: 'Validate demand', detail: '500 units confirmed', status: 'done' },
      { id: 's2', label: 'Reserve Atlas inventory', detail: 'Reserve 500 units', status: 'active' },
      { id: 's3', label: 'Book certified carrier', detail: 'Thursday pickup', status: 'queued' },
      { id: 's4', label: 'Confirm Friday delivery', detail: 'Close fulfillment loop', status: 'queued' }
    ],
    baselinePlan: [
      { id: 'b1', label: 'Validate demand', detail: '500 units confirmed', status: 'done' },
      { id: 'b2', label: 'Reserve Atlas inventory', detail: 'Reserve 500 units', status: 'active' },
      { id: 'b3', label: 'Book certified carrier', detail: 'Thursday pickup', status: 'queued' },
      { id: 'b4', label: 'Confirm Friday delivery', detail: 'Close fulfillment loop', status: 'queued' }
    ],
    events: [],
    revisions: [],
    baselineOutcome: 'Assumes Atlas still has 500 units.',
    adaptiveOutcome: 'Plan v1 remains valid.',
    containment: null,
    metric: { invalidated: 0, preserved: 3, revisions: 0, unsafeBlocked: 0 }
  };
}

export function replicaInitial(): RunState {
  return {
    schemaVersion: 1,
    scenario: 'replica',
    title: 'Restore database latency without risking stale-data failover.',
    eyebrow: 'MISSION 02 / INCIDENT RESPONSE',
    mission: 'Primary latency is elevated. The runbook will fail over only if the replica remains current enough to preserve the recovery objective.',
    eventLabel: 'Inject telemetry event',
    eventDescription: 'Backup replica lag jumps from 18 seconds to 18 minutes.',
    sourceLabel: 'Database telemetry stream · trust 0.99 · event-driven',
    phase: 'executing v1',
    planVersion: 1,
    constraints: ['RPO ≤ 60 seconds', 'No unverified failover', 'Restore service safely'],
    worldFacts: ['Primary p95 latency: 920ms', 'Replica lag: 18s', 'Write traffic: elevated'],
    assumptions: [
      { id: 'r1', label: 'Replica is safe for failover', expected: 'lag ≤ 60s', actual: '18s', status: 'valid' },
      { id: 'r2', label: 'Primary latency requires action', expected: 'p95 > 800ms', actual: '920ms', status: 'valid' },
      { id: 'r3', label: 'Failover preserves recovery objective', expected: 'RPO ≤ 60s', actual: '18s exposure', status: 'valid' }
    ],
    adaptivePlan: [
      { id: 's1', label: 'Confirm latency incident', detail: 'p95 > 800ms', status: 'done' },
      { id: 's2', label: 'Verify replica freshness', detail: '18s lag', status: 'done' },
      { id: 's3', label: 'Fail over to replica', detail: 'Switch write primary', status: 'active' },
      { id: 's4', label: 'Verify recovery', detail: 'Check RPO + latency', status: 'queued' }
    ],
    baselinePlan: [
      { id: 'b1', label: 'Confirm latency incident', detail: 'p95 > 800ms', status: 'done' },
      { id: 'b2', label: 'Verify replica freshness', detail: '18s lag', status: 'done' },
      { id: 'b3', label: 'Fail over to replica', detail: 'Switch write primary', status: 'active' },
      { id: 'b4', label: 'Verify recovery', detail: 'Check RPO + latency', status: 'queued' }
    ],
    events: [],
    revisions: [],
    baselineOutcome: 'Failover remains armed.',
    adaptiveOutcome: 'Plan v1 remains valid.',
    containment: null,
    metric: { invalidated: 0, preserved: 3, revisions: 0, unsafeBlocked: 0 }
  };
}

export function poisonedInitial(): RunState {
  const base = supplierInitial();
  return {
    ...base,
    scenario: 'poisoned',
    title: 'Failure test: contradictory evidence from an untrusted source.',
    eyebrow: 'FAILURE LAB / SIGNAL POISONING',
    mission: 'A low-trust signal will claim Atlas inventory disappeared while the authoritative source still reports healthy stock.',
    eventLabel: 'Inject poisoned signal',
    eventDescription: 'Forwarded email claims Atlas inventory is zero.',
    sourceLabel: 'Forwarded vendor email · trust 0.42 · conflicts with signed API',
    constraints: ['Budget ≤ $18,500', 'Delivery by Friday', 'Trusted evidence required for replan'],
    worldFacts: ['Signed inventory API: Atlas 500', 'Forwarded email: not yet received', 'Evidence threshold: 0.80'],
    baselineOutcome: 'Static plan remains unchanged.',
    adaptiveOutcome: 'Plan v1 remains valid.'
  };
}

export function initialState(scenario: ScenarioId): RunState {
  if (scenario === 'replica') return replicaInitial();
  if (scenario === 'poisoned') return poisonedInitial();
  return supplierInitial();
}

export function scenarioSignal(scenario: ScenarioId): Signal {
  if (scenario === 'replica') {
    return {
      id: 'evt_replica_lag',
      scenario,
      summary: 'Replica lag increased to 18 minutes',
      source: 'Database telemetry stream',
      trust: 0.99,
      contradiction: 'lag ≤ 60s is now false',
      receivedAt: 'event +0ms'
    };
  }
  if (scenario === 'poisoned') {
    return {
      id: 'evt_poisoned',
      scenario,
      summary: 'Email claims Atlas inventory is zero',
      source: 'Forwarded vendor email',
      trust: 0.42,
      contradiction: 'Conflicts with signed inventory API',
      receivedAt: 'event +0ms'
    };
  }
  return {
    id: 'evt_supplier_stock',
    scenario,
    summary: 'Atlas inventory dropped to 120 units',
    source: 'Signed inventory webhook',
    trust: 0.98,
    contradiction: 'stock ≥ 500 is now false',
    receivedAt: 'event +0ms'
  };
}
