# Tony negotiation API

Tony is the negotiation API personal assistants call to get their people the best deals. The assistant supplies the goal, delivers Tony's drafts through its own authorized channels, and reports the replies; Tony keeps the negotiation state, chooses tactics, and enforces the limits.

Endpoint: `/api/negotiations`. All requests require `Authorization: Bearer <NEGOTIATION_API_KEY>`. Generate a server key with `npm run api:key`; it is saved in `.env.local` and never printed. This key authenticates your integration to Tony. `MODEL_API_KEY` authenticates Tony to OpenRouter; do not give it to API clients.

This is a single-workspace API. Any holder of the server key can access negotiations in that workspace; per-customer keys, roles, rotation UI and rate limiting are not implemented.

## Create

POST with header `Idempotency-Key: a-unique-request-id` (8–128 characters):

```json
{
  "command": "create",
  "spec": {
    "subject": "Annual software renewal, same 10 seats and term",
    "counterparty": "Example vendor",
    "onBehalfOf": "Jordan Lee",
    "direction": "minimize",
    "currency": "USD",
    "initialOffer": 15000,
    "target": 10000,
    "limit": 12000,
    "requiredTerms": ["No auto-renewal"],
    "maxRounds": 4,
    "followUpHours": 24,
    "maxFollowUps": 2
  }
}
```

Optional `onBehalfOf` (up to 100 characters) names the person the assistant represents. Every draft opens with "This is Tony, negotiating on behalf of Jordan Lee."; without it, drafts say "on behalf of my client".

`limit` is the private ceiling for `minimize`, or private floor for `maximize` (for example compensation). `target` must be inside that limit. Keep all amounts on the same currency and pricing basis; no automatic currency, monthly/annual, tax, benefits or insurance-coverage conversion occurs. Optional `deadline` is an ISO timestamp within the next 30 days; default is seven days.

The response contains `deal.id` and `deal.version`. Repeating the same idempotency key and spec returns the same negotiation; a changed spec with that key is rejected.

## Command envelope

Every subsequent POST includes the current `id`, `version`, and `command`. A stale version returns 409. Recover with `GET /api/negotiations?id=ID` using the same authorization header.

| Command | Additional fields | Effect |
|---|---|---|
| `next` | None | Produces one draft, follows up if due, or stops. When a quote is inside the private limit and required terms are met, Jev decides whether that price is acceptable to present. Already-pending unsent drafts are returned unchanged. |
| `mark_sent` | `draftId`, `deliveryId` | Caller reports actual authorized delivery. Starts the real follow-up timer. |
| `reply` | `draftId`, `amount`, `acceptedTerms`, `sourceId`, `message` | Records the caller-supplied response and measured price movement. |
| `pause` / `resume` | None | Preserve and resume pending work. |
| `revise` | `spec` containing changed target/limit/terms/etc. | Invalidates pending drafts and prior approval; retains rounds, source evidence, and baseline. |
| `walk_away` | None | Ends the negotiation. |
| `approve` | None | Records principal approval of an eligible unexpired packet; performs no transaction. |

Example next step:

```json
{"command":"next","id":"RETURNED_ID","version":0}
```

A draft includes stable `id`, `text`, `amount`, `round`, and `tactic`. Deliver it through your authorized email/chat/other adapter, deduplicating by draft ID. Only then call `mark_sent`. The caller must reconcile uncertain delivery outcomes before retrying: Tony does not independently guarantee exactly-once delivery to external systems.

`acceptedTerms` contains exact strings from `requiredTerms`. This is an assertion from your integration, not independent legal/semantic verification. Preserve the underlying written offer and use `sourceId` to identify it. Counterparty replies are treated as untrusted data in model prompts.

Before `needs_approval`, the server asks Jev (a yes/no decision, not a text model) whether the price is acceptable to present to the user. The application presents it only when Jev’s yes-probability is at least 0.50. A no while rounds remain prepares another counterparty draft instead of an approval packet. A no after the round, stall, or follow-up cap walks away without requesting approval. Jev cannot override the private limit or required terms, and it does not approve a purchase. `deal.presentation` records `source`, `present`, `probability`, `threshold`, and `amount`. Without `JEV_API_KEY`, the same code rules present an eligible price and `source` is `rules`. A pending draft is still for the counterparty, not an approval request. Set `JEV_MODEL=jev-latest` unless you pin another Jev model.

## Persistence and learning

Atlas `negotiation_sessions` stores the bounded current state. `negotiation_events` stores the separate history. A transaction commits each version and event together. The current API returns the latest 30 events; full archive pagination is not implemented. Each tactic accumulates response count and signed price improvement, which the model sees when choosing subsequent tactics. Outbound drafts use grounded templates; the model selects the tactic rather than generating arbitrary promises. This is feedback-conditioned strategy selection, not trained model weights or proven optimal bargaining.

`npm run worker` prepares drafts for active API negotiations and due follow-ups without a browser. It never sends them. Your integration polls GET and delivers/acknowledges drafts. Without the worker, your integration calls `next` on its own schedule. Repeated worker scans stop at `draft_ready` until a delivery acknowledgement arrives.

## Verification

`npm test` exercises negotiation invariants with no provider cost. `node --env-file=.env.local --import tsx scripts/api-smoke.ts` exercises live Atlas and model planning with synthetic vendor replies. It creates one test session and sends no external messages.

## Limits

This is a numeric price plus required-terms prototype. It does not negotiate arbitrary nonnumeric disputes, guarantee discounts, verify counterparty identity/evidence, interpret policy coverage or contracts, send real communications, sign documents, or execute purchases. Add domain-specific validation and transport adapters for real use. Hosted deployment, public API quotas, production authentication, event indexes and full retry/monitoring operations remain future work.

## Hosted scheduler

The Vercel deployment includes a daily authenticated `/api/tick` invocation, processing at most one due API negotiation per tick. Your server may call it with `Authorization: Bearer <CRON_SECRET>` on a tighter schedule. It does not deliver drafts. The standalone worker scans continuously instead. Do not expose the scheduler key to browser clients.
