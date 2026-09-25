# RealityShift

**An agent that knows when its plan stopped being true.**

RealityShift is an event-driven adaptive-agent runtime built for DOO Builders League — **The Adaptive Agent**.

It runs a versioned multi-step plan against a persisted world model. New signals do not automatically trigger a re-prompt. A revision happens only when a signal:

1. contradicts a plan precondition,
2. passes an evidence gate,
3. still permits a new plan inside the mission's immutable constraints.

Every accepted revision produces a visible **“I changed my mind because…”** trace containing the invalidated assumption, evidence, preserved constraints, and the plan diff.

## Why this is different

Most adaptive demos are timers wrapped around prompts. RealityShift has no fixed re-planning clock.

```text
PLAN → EXECUTE → OBSERVE → RE-EVALUATE → REVISE
                    ↑
          contradiction event only
```

The live build also runs a static control plan beside the adaptive agent so the failure avoided by adaptation is visible rather than hypothetical.

## Demo scenarios

### 1. Supplier shock

The plan assumes Atlas can supply all 500 units. A signed inventory event drops available stock to 120.

- Static baseline: continues reserving stock that no longer exists.
- RealityShift: invalidates the stock assumption and creates plan v2 using 120 Atlas + 380 Nova units.
- Preserved: Friday deadline, supplier certification, and $18,500 budget.

### 2. Replica lag

The runbook is preparing a database failover while the replica is only 18 seconds behind. A telemetry event suddenly reports 18 minutes of lag.

- Static baseline: promotes stale data and risks a data-loss incident.
- RealityShift: blocks failover, throttles noncritical writes, lets the replica catch up, and escalates before promotion.
- Preserved: 60-second RPO and no-unverified-failover rule.

## Deliberate failure test

A forwarded vendor email claims Atlas inventory is zero, but its trust score is only 0.42 and the authoritative inventory source still reports 500.

A naive adaptive agent would overreact.

RealityShift returns **HOLD + VERIFY**, records the anomaly, and leaves plan v1 unchanged.

See [docs/FAILURE_TEST.md](docs/FAILURE_TEST.md).

## Technical depth

- Deterministic TypeScript adaptive state machine
- Explicit assumption invalidation and evidence gating
- Persisted world model, plans, events and revision history across reloads
- Event-driven signal bus and BroadcastChannel synchronization — no polling loop
- Immutable mission constraints carried across revisions
- Idempotent event handling
- Static non-adaptive control running side-by-side
- Four unit tests for the safety-critical engine
- GitHub Actions verifies tests + production build on every change

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ARCHITECTURE.svg](docs/ARCHITECTURE.svg).

## Submission materials

- [90-second walkthrough script](docs/DEMO_SCRIPT.md)
- [Failure test](docs/FAILURE_TEST.md)
- [Two-year thesis](docs/TWO_YEAR_THESIS.md)
- [Submission notes](docs/SUBMISSION_NOTES.md)

## Local development

```bash
npm install
npm test
npm run dev
```

Production verification:

```bash
npm run build
```

## AI/tools used

ChatGPT was used for architecture, implementation, test design, UI iteration and submission packaging. The adaptive mechanism itself is explicit in code: event ingestion, assumption invalidation, evidence gating, constraint preservation and plan versioning are not hidden in a prompt.

## Scope boundaries

This is a competition reference implementation. The demo uses synthetic supply-chain and database-operations scenarios. Production deployment would add signed event provenance, organization-specific policy stores, stronger identity/authentication, distributed tracing, external workflow adapters and server-side durable event storage.
