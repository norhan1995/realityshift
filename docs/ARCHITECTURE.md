# RealityShift — Architecture Snapshot

## Core rule

**Replan because a relevant assumption became false — never because a timer fired.**

```text
MISSION + IMMUTABLE CONSTRAINTS
              │
              ▼
        ┌───────────┐
        │ PLAN vN   │◄──────────────────────────────┐
        └─────┬─────┘                               │
              ▼                                     │
        ┌───────────┐                               │
        │ EXECUTE   │ one reversible step           │
        └─────┬─────┘                               │
              ▼                                     │
        ┌───────────┐      event / telemetry        │
        │ OBSERVE   │◄───────────────────────┐      │
        └─────┬─────┘                        │      │
              ▼                              │      │
   ┌─────────────────────┐                   │      │
   │ CONTRADICTION CHECK │                   │      │
   │ does signal falsify │                   │      │
   │ a plan precondition?│                   │      │
   └─────┬─────────┬─────┘                   │      │
         │ no      │ yes                     │      │
         │         ▼                         │      │
         │   ┌───────────────┐               │      │
         │   │ EVIDENCE GATE │ trust /       │      │
         │   │               │ corroboration │      │
         │   └──────┬────────┘               │      │
         │          │ pass                   │      │
         │          ▼                        │      │
         │   ┌─────────────────┐              │      │
         │   │ RE-EVALUATE     │ mission +   │      │
         │   │ & REPLAN        │ constraints │      │
         │   └──────┬──────────┘              │      │
         │          ▼                         │      │
         │   ┌─────────────────┐              │      │
         │   │ VALIDATE vN+1   │ no invariant│      │
         │   │                 │ may break    │      │
         │   └──────┬──────────┘              │      │
         │          └─────────────────────────┘      │
         └──────── continue current plan ────────────┘
```

## Runtime layers

1. **Scenario/world model** — mission, constraints, facts and assumptions.
2. **Adaptive engine** — pure deterministic signal evaluation in `src/engine.ts`.
3. **Persistence** — versioned browser storage in `src/store.ts`.
4. **Event transport** — CustomEvent for same-view updates + BroadcastChannel for other open tabs/windows.
5. **Judge UI** — adaptive plan beside a static control, causal revision trace, event log and failure lab.

## Why browser persistence here

The challenge evaluates adaptive planning rather than infrastructure procurement. The production build intentionally has no required database, API key or paid service, so a clean clone reproduces the entire mechanism. Reloading the app preserves each plan version and event history. Multiple open tabs receive state-change events without polling.

A production deployment can replace the `store.ts` adapter with Postgres/Kafka/WebSockets without changing `engine.ts`.

## Safety envelope

A contradiction is necessary but not sufficient for adaptation.

```text
contradiction
  + trusted/corroborated evidence
  + feasible constrained replan
  = accepted plan revision
```

Weak or conflicting evidence produces **HOLD + VERIFY** instead of a speculative replan.
