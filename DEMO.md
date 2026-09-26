# One-minute demo

Before recording, use Atlas and the model planner. Start a new mission and advance through quote collection. Keep a terminal showing `npm run worker`. Do not represent the deterministic preview as model autonomy.

0–8 seconds: “Buying a car takes weeks of follow-ups. Followthrough holds the goal, evidence, and next action across that entire journey.” Show the brief and synthetic-demo label.

8–20 seconds: Advance discovery and quotes. “It compares written all-in prices. A large fee gap changes how it negotiates, and the resulting price changes become feedback.” Show the stored policy and quote reduction. State that dealer replies and time are simulated.

20–35 seconds: Lower the budget to $29,500. Stop the worker with Ctrl+C, then restart it. “The process can die. The new budget and completed work survive in MongoDB. It picks up from the saved version.” Show the resumed version number; do not use UI pause alone as evidence of a process restart.

35–47 seconds: Show rejected branded-title offer and qualifying Civic. “The cheapest listing fails the title constraint. It retains the buyer's requirements and finds the best verified eligible offer.”

47–55 seconds: Briefly show `lib/store.ts` transaction and `lib/planner.ts` bounded context. “The archive stays durable; the planner carries just the current brief, evidence, and feedback.”

55–60 seconds: Show purchase approval. “It brings me a decision with evidence. I stay in control of the commitment.”

Timing depends on model latency. Prepare intermediate checkpoints before recording and disclose any cuts. Keep a backup recording of the actual working flow.

# Submission description

Followthrough is a long-horizon car-purchase agent that preserves a buyer's changing goals through discovery, itemized quotes, negotiation, verification, and human review. MongoDB stores versioned checkpoints and execution evidence so the worker can recover after interruption without forgetting new constraints or repeating committed demo actions. A bounded working context keeps the current brief, offer evidence, and numeric negotiation feedback separate from the event archive. The prototype demonstrates the workflow with synthetic listings, simulated dealer replies, and accelerated time; a configurable model selects eligible actions. It prepares an approval packet and does not execute a real purchase.

# Evidence to collect

Record actual evaluation output, model and provider, token count, elapsed runtime, storage mode, and a worker restart. Do not present aggregate reductions across all three quotes as savings on the selected car. Do not describe a stale-memory ablation as a competitive model benchmark.

# Questions judges may ask

**Why MongoDB?** The current mission and its event are committed together, giving the agent a recoverable checkpoint and an auditable history. Bounded current evidence is read independently of the archive.

**What learns?** Quote reductions and stalled replies become per-tactic numeric feedback for the model. Multiple rounds and timed follow-ups continue until a target or stopping condition is reached. This is strategy selection using feedback, not weight training.

**What is autonomous?** With the model configured, it selects from valid next actions; a separate worker executes and persists steps without the browser. Dealer behavior is simulated. Final commitment requires human review.

**What is long horizon here?** Durable continuation across processes and changed constraints, plus bounded context independent of stored history. Actual billion-token processing and weeks of execution have not been tested.

**How would it buy a home or insurance?** Reuse goal persistence, evidence provenance, deadlines, and approval gates; replace domain tools and constraint evaluators. The API accepts a price target, private limit, and required terms across domains; domain-specific validation and real communication adapters are not implemented.

## Updated core message

“Followthrough is a persistent negotiation API. Give it the target and the line you will not cross. It counters, follows up, remembers every concession, and brings the final decision back to you.”

Show `/api-guide` briefly, then use the car workflow to demonstrate repeated counters and the Northstar silence/follow-up event. Keep synthetic dealer responses and accelerated time visible. Show selected-offer savings separately from reductions summed across competing offers.
