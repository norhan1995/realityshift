import { evaluateSignal } from './engine';
import { initialState, scenarioSignal } from './scenarios';
import type { RunState, ScenarioId } from './types';

const PREFIX = 'realityshift:run:v1:';
const CHANNEL = 'realityshift-events-v1';

type Listener = (state: RunState) => void;

function key(scenario: ScenarioId) {
  return PREFIX + scenario;
}

function safeParse(raw: string | null): RunState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RunState;
    return parsed.schemaVersion === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function loadRun(scenario: ScenarioId): RunState {
  if (typeof window === 'undefined') return initialState(scenario);
  return safeParse(window.localStorage.getItem(key(scenario))) ?? initialState(scenario);
}

export function saveRun(state: RunState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key(state.scenario), JSON.stringify(state));
}

export function resetRun(scenario: ScenarioId): RunState {
  const state = initialState(scenario);
  saveRun(state);
  publish(state);
  return state;
}

export function injectRealityChange(scenario: ScenarioId): RunState {
  const current = loadRun(scenario);
  const signal = scenarioSignal(scenario);
  const result = evaluateSignal(current, signal);
  saveRun(result.state);
  publish(result.state);
  return result.state;
}

function publish(state: RunState) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<RunState>('realityshift:state', { detail: state }));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(state);
    channel.close();
  }
}

export function subscribe(listener: Listener): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleLocal = (event: Event) => {
    const custom = event as CustomEvent<RunState>;
    listener(custom.detail);
  };
  window.addEventListener('realityshift:state', handleLocal);

  let channel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<RunState>) => listener(event.data);
  }

  return () => {
    window.removeEventListener('realityshift:state', handleLocal);
    channel?.close();
  };
}
