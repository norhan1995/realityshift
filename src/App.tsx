import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  CircleDot,
  GitBranch,
  History,
  Radio,
  RefreshCw,
  RotateCcw,
  ServerCrash,
  ShieldCheck,
  Sparkles,
  Waypoints,
  XCircle,
  Zap
} from 'lucide-react';
import { injectRealityChange, loadRun, resetRun, subscribe } from './store';
import type { PlanStep, RunState, ScenarioId, StepStatus } from './types';

const scenarios = [
  { id: 'supplier' as const, label: 'Supplier shock', icon: Boxes },
  { id: 'replica' as const, label: 'Replica lag', icon: ServerCrash }
];

function statusIcon(status: StepStatus) {
  if (status === 'done') return <Check size={14} />;
  if (status === 'danger' || status === 'blocked') return <XCircle size={14} />;
  if (status === 'changed') return <GitBranch size={14} />;
  if (status === 'active') return <Activity size={14} />;
  return <CircleDot size={14} />;
}

function PlanColumn({ title, subtitle, badge, plan, outcome, tone }: {
  title: string;
  subtitle: string;
  badge: string;
  plan: PlanStep[];
  outcome: string;
  tone: 'adaptive' | 'static';
}) {
  return (
    <section className={'plan-card ' + tone}>
      <div className='card-head'>
        <div><span className='micro'>{subtitle}</span><h3>{title}</h3></div>
        <span className='badge'>{badge}</span>
      </div>
      <div className='steps'>
        {plan.map((step, index) => (
          <div className={'step ' + step.status} key={step.id}>
            <div className='step-index'>{index + 1}</div>
            <div className='step-copy'><strong>{step.label}</strong><span>{step.detail}</span></div>
            <div className='step-state'>{statusIcon(step.status)}</div>
          </div>
        ))}
      </div>
      <div className='outcome'><span>Projected outcome</span><strong>{outcome}</strong></div>
    </section>
  );
}

function Architecture() {
  return (
    <div className='architecture-view'>
      <div className='section-heading'>
        <span className='micro'>SYSTEM LOOP</span>
        <h2>Adapt only when reality invalidates the plan.</h2>
        <p>There is no timer-based re-prompt. A new event must contradict a plan precondition, pass the evidence gate, and still fit the mission constraints.</p>
      </div>
      <div className='loop'>
        {[
          ['PLAN', 'Versioned goal + assumptions'],
          ['EXECUTE', 'Advance one reversible step'],
          ['OBSERVE', 'Receive event-driven signals'],
          ['RE-EVALUATE', 'Detect contradictions'],
          ['REVISE', 'Generate a constrained plan']
        ].map((node, index) => (
          <div className='loop-wrap' key={node[0]}>
            <div className='loop-node'><span>{String(index + 1).padStart(2, '0')}</span><strong>{node[0]}</strong><small>{node[1]}</small></div>
            {index < 4 ? <ArrowRight className='loop-arrow' size={24} /> : null}
          </div>
        ))}
      </div>
      <div className='architecture-grid'>
        <article><ShieldCheck size={20} /><strong>Evidence gate</strong><p>Source trust and corroboration decide whether a contradiction may rewrite the plan.</p></article>
        <article><GitBranch size={20} /><strong>Constraint-preserving replan</strong><p>Immutable mission constraints survive every revision. A cheaper plan that violates safety is rejected.</p></article>
        <article><History size={20} /><strong>Versioned memory</strong><p>World model, events and plan revisions persist across reloads so the agent never loses why it changed course.</p></article>
        <article><Radio size={20} /><strong>Event-driven observation</strong><p>Signals are dispatched through an event bus and BroadcastChannel. No polling loop is used.</p></article>
      </div>
      <div className='formula'><span>REPLAN TRIGGER</span><code>new_signal ∧ invalidates(plan_precondition) ∧ evidence_gate_passes → re-evaluate</code></div>
    </div>
  );
}

function FailureLab({ state, onInject, onReset }: { state: RunState; onInject: () => void; onReset: () => void }) {
  return (
    <div className='failure-view'>
      <div className='failure-hero'>
        <div><span className='micro red'>DELIBERATE FAILURE TEST</span><h2>What if the new reality signal is wrong?</h2><p>A naive adaptive agent can be worse than a static one: it may overreact to poisoned or conflicting evidence. RealityShift contains that failure before rewriting the plan.</p></div>
        <ShieldCheck size={54} />
      </div>
      <div className='failure-grid'>
        <article className='attack-card'>
          <span className='micro'>INCOMING SIGNAL</span><h3>“Atlas inventory is zero. Switch suppliers now.”</h3>
          <div className='signal-row'><span>Source</span><strong>Forwarded vendor email</strong></div>
          <div className='signal-row'><span>Trust score</span><strong className='red-text'>0.42 / 1.00</strong></div>
          <div className='signal-row'><span>Conflict</span><strong>Signed inventory source still reports 500</strong></div>
          <button className='danger-button' onClick={onInject} disabled={Boolean(state.containment)}><AlertTriangle size={16} /> Inject poisoned signal</button>
          <button className='ghost-button' onClick={onReset}><RotateCcw size={15} /> Reset failure test</button>
        </article>
        <article className='contain-card'>
          <span className='micro'>CONTAINMENT POLICY</span><h3>{state.containment ? 'HOLD + VERIFY' : 'Awaiting signal'}</h3>
          <p>{state.containment || 'The current plan remains unchanged until a contradictory signal arrives.'}</p>
          <div className='contain-list'>
            <div><Check size={15} /> Require trusted source ≥ 0.80</div>
            <div><Check size={15} /> Compare against authoritative evidence</div>
            <div><Check size={15} /> Preserve current plan when evidence conflicts</div>
            <div><Check size={15} /> Record the blocked adaptation in history</div>
          </div>
          <div className='version-lock'><span>Plan version</span><strong>v{state.planVersion}</strong><small>{state.containment ? 'unchanged — unsafe adaptation blocked' : 'stable'}</small></div>
        </article>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'run' | 'failure' | 'architecture'>('run');
  const [scenario, setScenario] = useState<ScenarioId>('supplier');
  const [state, setState] = useState<RunState>(() => loadRun('supplier'));
  const [failureState, setFailureState] = useState<RunState>(() => loadRun('poisoned'));

  useEffect(() => {
    const unsubscribe = subscribe((next) => {
      if (next.scenario === 'poisoned') setFailureState(next);
      if (next.scenario === scenario) setState(next);
    });
    return unsubscribe;
  }, [scenario]);

  useEffect(() => { setState(loadRun(scenario)); }, [scenario]);

  const activeState = view === 'failure' ? failureState : state;
  const latestRevision = activeState.revisions.at(-1) ?? null;
  const eventSeen = activeState.events.length > 0;
  const triggerLabel = useMemo(() => eventSeen ? 'Reality change processed' : activeState.eventLabel, [activeState.eventLabel, eventSeen]);

  const inject = (target: ScenarioId) => {
    const next = injectRealityChange(target);
    if (target === 'poisoned') setFailureState(next); else setState(next);
  };
  const reset = (target: ScenarioId) => {
    const next = resetRun(target);
    if (target === 'poisoned') setFailureState(next); else setState(next);
  };

  return (
    <div className='app-shell'>
      <header className='topbar'>
        <button className='brand' onClick={() => setView('run')} aria-label='RealityShift home'>
          <span className='brand-mark'><Waypoints size={20} /></span>
          <span><strong>REALITY</strong>SHIFT<small>adaptive agent runtime</small></span>
        </button>
        <nav aria-label='Primary'>
          <button className={view === 'run' ? 'active' : ''} onClick={() => setView('run')}>Adaptive Run</button>
          <button className={view === 'failure' ? 'active' : ''} onClick={() => setView('failure')}>Failure Lab</button>
          <button className={view === 'architecture' ? 'active' : ''} onClick={() => setView('architecture')}>Architecture</button>
        </nav>
        <div className='live-pill live'><i></i>event bus live</div>
      </header>

      <main>
        {view === 'architecture' ? <Architecture /> : null}
        {view === 'failure' ? <FailureLab state={failureState} onInject={() => inject('poisoned')} onReset={() => reset('poisoned')} /> : null}
        {view === 'run' ? (
          <>
            <section className='hero'>
              <div><span className='kicker'><Sparkles size={14} /> THE ADAPTIVE AGENT</span><h1>An agent that knows when its plan <em>stopped being true.</em></h1><p>RealityShift persists a world model, watches event-driven signals for contradictions, and revises only when the mission demands it.</p></div>
              <div className='hero-rule'><span>ADAPTATION RULE</span><strong>Contradiction, not a clock.</strong><small>No “re-prompt every N seconds.”</small></div>
            </section>

            <section className='scenario-bar'>
              <div><span className='micro'>DEMO SCENARIO</span><div className='scenario-switch'>{scenarios.map((item) => { const Icon = item.icon; return <button key={item.id} className={scenario === item.id ? 'selected' : ''} onClick={() => setScenario(item.id)}><Icon size={15} />{item.label}</button>; })}</div></div>
              <button className='reset-link' onClick={() => reset(scenario)}><RefreshCw size={14} />Reset run</button>
            </section>

            <section className='mission-strip'>
              <div><span className='micro'>{state.eyebrow}</span><h2>{state.title}</h2><p>{state.mission}</p></div>
              <div className='version-chip'><span>PLAN VERSION</span><strong>v{state.planVersion}</strong><small>{state.phase}</small></div>
            </section>

            <section className='facts-grid'>
              <article><span className='micro'>IMMUTABLE CONSTRAINTS</span>{state.constraints.map((item) => <div className='fact' key={item}><ShieldCheck size={14} />{item}</div>)}</article>
              <article><span className='micro'>CURRENT WORLD MODEL</span>{state.worldFacts.map((item) => <div className='fact' key={item}><CircleDot size={14} />{item}</div>)}</article>
              <article className='metrics'><div><strong>{state.metric.invalidated}</strong><span>assumptions invalidated</span></div><div><strong>{state.metric.preserved}</strong><span>constraints preserved</span></div><div><strong>{state.metric.revisions}</strong><span>causal replans</span></div></article>
            </section>

            <section className='signal-panel'>
              <div className='signal-copy'><span className='micro'>LIVE WORLD SIGNAL</span><h3>{state.eventDescription}</h3><p><Radio size={14} />{state.sourceLabel}</p></div>
              <button className={'inject-button ' + (eventSeen ? 'complete' : '')} onClick={() => inject(scenario)} disabled={eventSeen}>{eventSeen ? <Check size={17} /> : <Zap size={17} />}{triggerLabel}</button>
            </section>

            <section className='comparison'>
              <PlanColumn title='RealityShift' subtitle='ADAPTIVE AGENT' badge={'PLAN v' + state.planVersion} plan={state.adaptivePlan} outcome={state.adaptiveOutcome} tone='adaptive' />
              <div className='versus'>VS</div>
              <PlanColumn title='Static baseline' subtitle='NON-ADAPTIVE CONTROL' badge='PLAN v1 LOCKED' plan={state.baselinePlan} outcome={state.baselineOutcome} tone='static' />
            </section>

            <section className='trace-grid'>
              <article className='assumption-card'>
                <div className='card-head'><div><span className='micro'>WORLD MODEL CHECK</span><h3>Assumptions</h3></div><Activity size={19} /></div>
                <div className='assumption-list'>{state.assumptions.map((item) => <div className={'assumption ' + item.status} key={item.id}><div className='assumption-dot'></div><div><strong>{item.label}</strong><span>{item.expected}</span></div><small>{item.actual}</small></div>)}</div>
              </article>
              <article className={'mind-change-card ' + (latestRevision ? 'changed' : '')}>
                <div className='card-head'><div><span className='micro'>REVISION TRACE</span><h3>I changed my mind because…</h3></div><GitBranch size={19} /></div>
                {latestRevision ? <><blockquote>{latestRevision.because}</blockquote><div className='trace-tags'>{latestRevision.invalidated.map((item) => <span className='bad-tag' key={item}>{item}</span>)}{latestRevision.preserved.map((item) => <span className='good-tag' key={item}>{item}</span>)}</div><div className='safety-line'><ShieldCheck size={15} />{latestRevision.safety}</div></> : <div className='empty-trace'><GitBranch size={30} /><strong>No revision yet.</strong><span>The plan changes only when a trusted signal invalidates a relevant precondition.</span></div>}
              </article>
            </section>

            <section className='event-history'>
              <div className='card-head'><div><span className='micro'>PERSISTED EVENT LOG</span><h3>Reality changes are evidence, not amnesia.</h3></div><History size={19} /></div>
              {state.events.length ? state.events.map((event) => <div className='event-row' key={event.id}><span className='event-time'>{event.receivedAt}</span><div><strong>{event.summary}</strong><small>{event.source} · trust {event.trust.toFixed(2)}</small></div><span className='contradiction'>{event.contradiction}</span><span className='decision'>{event.decision}</span></div>) : <div className='empty-event'>No contradiction events yet. The agent is executing plan v1 against a valid world model.</div>}
            </section>
          </>
        ) : null}
      </main>

      <footer><span><Waypoints size={15} />REALITYSHIFT</span><strong>Plan → Execute → Observe → Re-evaluate → Revise</strong><small>mission-driven adaptation · persisted state · evidence-gated replans</small></footer>
    </div>
  );
}
