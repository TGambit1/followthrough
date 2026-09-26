# One-minute demo: persistence earns the next concession

Record on-site September 26. Keep the synthetic-dealer / accelerated-time label visible. Use a new mission with the target set to $28,000. Prepare intermediate checkpoints so recording is not consumed by waiting for model responses; disclose cuts. Never show `.env.local` or API credentials in the video.

| Time | Show | Say |
|---|---|---|
| 0–8s | Purchase brief: target, private ceiling, round limit | “Followthrough negotiates toward your target and remembers the line you will not cross.” |
| 8–20s | Dealer quote, first counter, response | “It challenges add-ons, demands a written all-in total, and keeps countering after the first discount.” |
| 20–31s | Northstar silence and follow-up event | “Silence does not erase the negotiation. It saves a follow-up deadline and holds the same counter.” |
| 31–43s | Stop/restart the separate worker; show preserved pending round | “Kill the process. MongoDB preserves the counter, evidence, and next action. It resumes the same negotiation.” |
| 43–52s | `lib/deal.ts` and `/api-guide` | “Any integration can submit a price-and-terms goal, deliver the draft, and return a response. Version checks protect the history.” |
| 52–60s | Final quote and approval button | “The demo reached $27,900 after repeated counters. This is a simulated outcome. You approve the final decision.” |

## Recording preparation

1. Open the app and `lib/deal.ts` / `lib/store.ts` in separate windows.
2. Start a fresh car mission and advance to a pending counter. Keep enough unfinished work to demonstrate recovery.
3. Use `npm run worker` in a terminal. Stop it with Ctrl+C and restart it for an actual process recovery demonstration. The UI Pause button alone is not proof of process restart.
4. Show the saved round and upcoming reply/follow-up, then the final decision. Keep the recording concise; use a backup recording of the working flow if live latency is high.
5. Check playback and audible narration before submission.

## Judge questions

**Why MongoDB?** Current state and its event are committed together. A separate archive preserves history while each model decision reads a bounded working state.

**What learns?** Numeric quote improvements accumulate by tactic and enter the next model decision. This is feedback-conditioned tactic selection, not trained weights or proof of optimal bargaining.

**What is autonomous?** The worker prepares counters and due follow-ups. The car adapter simulates delivery and replies. API clients must provide authorized real transports and response evidence. No purchase is executed.

**What is long horizon?** Durable continuation across processes, waiting periods, and changed goals. Billion-token scale and weeks of live execution remain untested.

**What can the API negotiate?** A price on a consistent currency/time basis, plus explicit required terms, in either a buying or selling direction. Specialized contractual interpretation and domain integrations are outside this prototype.

See SUBMISSION.md for the final description and links.
