export type StepStatus = 'done' | 'active' | 'queued' | 'changed' | 'danger' | 'blocked';
export type AssumptionStatus = 'valid' | 'invalid' | 'uncertain';
export type ScenarioId = 'supplier' | 'replica' | 'poisoned';

export type PlanStep = {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
};

export type Assumption = {
  id: string;
  label: string;
  expected: string;
  actual: string;
  status: AssumptionStatus;
};

export type Signal = {
  id: string;
  scenario: ScenarioId;
  summary: string;
  source: string;
  trust: number;
  contradiction: string;
  receivedAt: string;
};

export type EventItem = Signal & {
  decision: string;
};

export type Revision = {
  version: number;
  because: string;
  invalidated: string[];
  preserved: string[];
  before: string[];
  after: string[];
  safety: string;
};

export type RunState = {
  schemaVersion: 1;
  scenario: ScenarioId;
  title: string;
  eyebrow: string;
  mission: string;
  eventLabel: string;
  eventDescription: string;
  sourceLabel: string;
  phase: string;
  planVersion: number;
  constraints: string[];
  worldFacts: string[];
  assumptions: Assumption[];
  adaptivePlan: PlanStep[];
  baselinePlan: PlanStep[];
  events: EventItem[];
  revisions: Revision[];
  baselineOutcome: string;
  adaptiveOutcome: string;
  containment: string | null;
  metric: {
    invalidated: number;
    preserved: number;
    revisions: number;
    unsafeBlocked: number;
  };
};

export type EngineResult = {
  state: RunState;
  adapted: boolean;
  contained: boolean;
  reasonCode: 'ADAPT' | 'HOLD_VERIFY' | 'NO_CHANGE';
};
