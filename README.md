# Tony

Tony is the deal agent for personal assistants. An assistant calls Tony's negotiation API with its person's target, private walk-away limit and required terms; Tony carries the negotiation through counters, follow-ups and interruptions, and brings the final decision back for approval. The included car demo shows Tony taking a car-buying goal through discovery, itemized quotes, negotiation, verification, and human review.

Built for the Long Horizon Engineering track. This original prototype uses fictional cars and simulated dealer responses. It does not contact dealers, execute payments, sign contracts, or buy a vehicle.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3100. Click **Start purchase mission**, then **Run next step** or **Autoplay demo**. Without credentials, the dashboard explicitly reports **Local file preview** and **Deterministic preview**. Local checkpoints live in `.data/` and survive server restarts.

To keep missions progressing with the browser closed, run a second terminal in this directory:

```sh
npm run worker
```

Counteroffers and replies are separate steps. Wait steps advance the simulated clock to a saved reply or follow-up deadline. It waits at least five real seconds after the last saved update. This accelerated demo is not a real multiday evaluation. Autoplay advances only while the page is open; the separate worker is what runs independently of the browser. Stop the worker with Ctrl+C to demonstrate process interruption. Restart it to load the durable checkpoint. Use the Pause button when you want the mission itself paused.

## Atlas setup — required for hackathon eligibility

1. Use the invitation in your **Atlas Hackathon Sandbox email**. Create the project and cluster through that invitation. An unrelated personal cluster does not satisfy the resource guide's requirement.
2. In the sandbox project, open your cluster's **Connect** dialog.
3. Create a database user. This is distinct from your Atlas account. Give the app the database permissions required to read and write `followthrough`.
4. Add your current public IP to the project's network access list. A deployed server needs its own permitted network access.
5. Select **Drivers**, choose **Node.js**, and copy the connection URI. Replace the password placeholder; percent-encode special characters if needed.
6. Copy `.env.example` to `.env.local` and set `MONGODB_URI`. Keep `MONGODB_DB=followthrough`.
7. Restart the web process and worker. Create a **new mission**. Local preview missions are not automatically migrated to Atlas.
8. Confirm the dashboard says **MongoDB Atlas** and that `missions` and `events` appear in Atlas after the first action.

Reference: https://www.mongodb.com/docs/atlas/connect-to-database-deployment/

## Model setup

1. Redeem the OpenRouter credit supplied to checked-in hackathon participants.
2. Create an API key at https://openrouter.ai/settings/keys.
3. Set `MODEL_API_KEY` in `.env.local`.
4. Set `MODEL_NAME` to an exact model ID available to your account. Choose it in OpenRouter's model catalog; the app deliberately has no hardcoded model recommendation.
5. Keep `MODEL_BASE_URL=https://openrouter.ai/api/v1` or use a compatible provider endpoint.
6. Restart the app and worker. Confirm the dashboard says **Model planner**.

To let Jev decide whether a price is acceptable to present, create a key at https://thejevai.com/settings/apikeys and set `JEV_API_KEY`. The dashboard then says **Jev price check**. Jev returns a yes-probability; the app presents the price only at 0.50 or above. Private limits, required terms, and final approval stay in code. Without the key, an in-limit price is presented by rule and the dashboard says **Rule price check**.

The planner chooses among currently eligible tools and explains the next action. The harness validates its output before executing the simulated tool and committing the result. Model errors are visible and do not silently fall back to deterministic mode. Credentials are read server-side only.

Reference: https://openrouter.ai/docs/quickstart

## What is technically demonstrated

- **Durability:** separate MongoDB mission and event records. A transaction atomically commits the next version and its event. Optimistic version checks reject stale worker commits.
- **Bounded working memory:** the planner reads the latest brief, three bounded offer records, and aggregate numeric feedback. The event archive is stored separately and only the most recent 30 events are displayed. No unbounded message transcript is sent to the model.
- **Goal changes:** changing budget or mileage invalidates any earlier selection and approval. A future run evaluates the latest constraints.
- **Hard feedback:** the synthetic dealer adapter returns numeric quote reductions. Tony challenges optional fees, anchors its counter, uses genuine verified alternatives, and asks for final written prices. Per-tactic reductions and stalled replies accumulate in durable state and inform the model. This is feedback-conditioned strategy selection, not trained model weights.
- **Process independence:** a separate worker progresses active missions while the browser is closed.
- **Human review:** Tony stops at a purchase packet. Approval records the user's review; it does not perform a transaction.

The synthetic adapter has no external side effects. Version checks prevent duplicate committed demo actions. Live external actions would need a durable outbox, provider idempotency support, reconciliation after uncertain results, explicit communication authorization, and real integrations before use.

## Validation

```sh
npm test
npm run evaluate
npm run build
```

The evaluation compares one negotiation round with up to four rounds against the same synthetic dealer adapter across nine budget/mileage combinations. It also checks changed constraints and recovery. It is not a model benchmark or proof of real-world savings.

## Deployment

Deploy this directory as a standalone Next.js project (set the hosting root directory to `followthrough` if publishing a parent repository). Supply the environment variables on the host. Production requires MongoDB; the local filesystem fallback is disabled. A long-running Node host can run `npm run worker`; ordinary web hosting does not automatically start that worker. The web demo's Run next step and Autoplay controls work without it.

Before publishing, configure model spend limits. The cookie is a random mission capability, not a full user-account system; this is a synthetic demo, not a production service for private purchase documents. Sessions are separate, but there is no public rate limiter or account recovery. Do not expose private real-world buyer data.

## Limits and next work

This prototype has three fixed fictional listings and bounded 100-step car missions. It does not demonstrate billions of tokens, real dealer negotiations, actual purchase completion, or autonomous operation over weeks. A real deployment needs discovery/communications adapters, offer refresh, retry backoff, authenticated users, event indexing and archival, and external-action reconciliation. The generic negotiation API supports price and required terms across domains; specialized home or insurance validation is not implemented.

## Submission checklist

- [ ] Build and run with the emailed Atlas Hackathon Sandbox.
- [ ] Enable and exercise the model planner.
- [ ] Run the separate worker and demonstrate actual restart recovery.
- [ ] Deploy and check the demo from a fresh browser.
- [ ] Publish an original public repository with no `.env.local`, `.data/`, secrets, or unrelated Bantr code.
- [ ] Record a 1-minute on-site video showing code and functionality built today; check audio/video playback.
- [ ] Submit repository, video, and concise description through Cerebral Valley.
- [ ] Confirm the exact submission deadline with organizers.
- [ ] Confirm September 30 attendance, 10 AM–4:30 PM, if selected as a finalist.

See DEMO.md for the recording script and project description.

## Negotiation is the core

The car demo now keeps a target separate from the private ceiling, runs multiple counteroffer rounds, holds the same counter during silence, follows up, and records why it stops. Update the target and round cap in the purchase brief. A branded title is rejected before negotiation.

For integrations, open `/api-guide` and read [API.md](API.md). Generate a separate client credential with `npm run api:key`. Atlas stores generic sessions and event history. The worker prepares drafts, while your authorized transport delivers them and reports actual responses.

See [HACKATHON-CHECKLIST.md](HACKATHON-CHECKLIST.md) for the requirement-by-requirement audit and outstanding submission work.

## Hosted scheduling and demo limits

Vercel runs `/api/tick` daily at approximately 09:00 UTC, authenticated with `CRON_SECRET`. Each invocation prepares at most one due API draft, oldest updated session first. This is a minimal scheduled deployment; your integration still delivers drafts and reports replies. Use the standalone worker or an authenticated external scheduler for faster follow-ups. Vercel Hobby daily scheduling is not precise to the minute. Public car-demo inference is capped at 300 calls per UTC day across visitors; `DEMO_MODEL_CALL_LIMIT` configures that cap.
