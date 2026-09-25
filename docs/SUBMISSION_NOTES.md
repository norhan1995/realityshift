# RealityShift — Submission Notes

## What to look at

1. **Supplier shock** — clearest before/after adaptation.
2. **Static baseline** — proves the original plan would have failed silently.
3. **Revision trace** — shows exactly why the agent changed its mind.
4. **Replica lag** — demonstrates the same architecture in a second domain.
5. **Failure Lab** — shows where adaptation itself becomes dangerous.
6. **Architecture** — explicit plan → execute → observe → re-evaluate → revise loop.

## Key decisions

- Replanning is triggered by contradiction events, never a fixed timer.
- Mission constraints are immutable across revisions.
- Evidence is gated before a contradiction can rewrite the plan.
- State and revision history persist across reloads.
- Event updates use an event bus/BroadcastChannel rather than polling.
- A static control is shown beside the adaptive agent.
- Failure handling is part of the product, not only documentation.

## AI usage

ChatGPT was used to design, implement, test and package the project.

The core adaptive mechanism is intentionally inspectable rather than hidden inside a generic LLM prompt: assumptions, signal trust, contradiction detection, plan versions, constraints and containment decisions are represented explicitly in code and UI.

## Out of scope

- production identity and tenant isolation
- external workflow execution
- cryptographic event signing
- organization-specific policy authoring
- arbitrary open-ended domain planning

The public demo uses synthetic scenarios and safe simulated actions.
