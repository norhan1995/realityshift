# RealityShift — 90-Second Demo Script

## 0–10s — Thesis
“Most agents execute the plan they started with. RealityShift asks a different question: is the world that made this plan valid still true?”

Show the live control room and the rule: **Contradiction, not a clock.**

## 10–38s — Supplier shock
Open **Supplier shock**. Point to mission constraints, plan v1 and the static baseline. Click **Inject inventory webhook**.

“Atlas drops from 500 units to 120. That falsifies a plan precondition. RealityShift creates plan v2, splits the order across Atlas and Nova, and preserves the deadline, certification rule and budget.”

Point to **I changed my mind because…** then the static baseline: “It would keep reserving inventory that no longer exists.”

## 38–60s — Second domain
Open **Replica lag** and inject telemetry.

“The replica was safe at 18 seconds behind. Reality changes it to 18 minutes. Static execution would promote stale data. RealityShift invalidates the failover assumption, blocks promotion, throttles writes, and preserves the 60-second RPO.”

## 60–78s — Failure thinking
Open **Failure Lab** and inject the poisoned signal.

“But adaptation itself can fail. This signal contradicts the plan, yet trust is only 0.42 and it conflicts with authoritative data. RealityShift returns HOLD + VERIFY. Plan v1 stays active.”

## 78–90s — Close
Open **Architecture**.

“Plan, execute, observe, re-evaluate, revise. Persisted state. Event-driven inputs. Every revision has a cause.”

Close: **“Change your mind when reality changes—not when the clock ticks.”**
