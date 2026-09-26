# Hackathon requirement audit

Source: supplied “[EXTERNAL] THE HARNESS ENGINEERING & MODEL WRANGLING HACKATHON RESOURCE GUIDE.docx”, reread September 26, 2026. This is a compliance/status audit, not an official judging rubric.

## Required eligibility and submission items

| Requirement | Current status | Evidence / remaining action |
|---|---|---|
| Build against one of the two statements | Long Horizon Engineering selected | Versioned checkpoints, persistent counters, follow-up deadlines, process recovery, bounded working context, and numeric feedback. |
| MongoDB as data and memory layer | Implemented; generic API verified live with Atlas and GPT-5.6 Luna | Atlas database `CV_hack_9_26`; mission/event transactions and generic negotiation session/event transactions. Live API test covered two rounds, idempotency, pause/resume, recovery, terms and approval; car multi-round engine tests pass. |
| Create project and cluster through emailed Atlas Hackathon Sandbox link | User reports sandbox setup completed; membership not independently verified | Confirm the Atlas project belongs to the invited hackathon sandbox. A successful database connection alone does not establish eligibility. |
| All work original; no prior projects | Project created in this session | Standalone `/Users/trickett/followthrough`; publish only this project. No Bantr application code was copied into it. Third-party libraries are used. Organizers have final say on originality. |
| Up to four team members | User reports solo | Within the stated team-size limit. |
| Public repository | Complete | https://github.com/TGambit1/followthrough verified PUBLIC. Saved credentials were scanned out; `.env.local`, local data, dependencies and build output are excluded. |
| Accessible demo link | Complete | https://followthrough-umber.vercel.app deployed on Vercel. Verified publicly without login: Atlas storage, model planner, mission create plus three steps, `/api-guide`, and 401 on unauthenticated `/api/negotiations` and `/api/tick`. |
| On-site recording September 26 | Outstanding | Record a one-minute video showing code and functionality built today. |
| Submit through Cerebral Valley | Outstanding | Submit public GitHub link, one-minute video, concise description; confirm your member entry and playback. |
| Finalist attendance September 30, 10 AM–4:30 PM | Unconfirmed | User must confirm attendance at MongoDB.local NYC if selected. |

## Track ambition and what we can substantiate

The statement asks for coherent memory across billions of tokens, long-term goal optimization, and learning from hard metric signals. Our checkpoint/event separation and bounded planner context are an architectural approach to long sessions, not proof of billion-token operation. No billion-token, weeks-long, or real-world negotiation success claim is supported by current tests.

Demonstrated or directly testable mechanisms:
- Interrupted processes recover current constraints and pending negotiation state.
- Counters, delivery receipts, supplied reply sources, numeric concessions, and per-tactic outcomes are durable.
- Follow-ups keep the prior counter unchanged and obey persisted deadlines and caps.
- The model receives numeric tactic outcomes; code enforces private limits, required terms, and approval gates. Jev judges whether an in-limit price is acceptable to present. It cannot override those gates or approve a purchase.
- The car demo has synthetic counterparties and accelerated days; generic API follow-up timestamps use real time and requires caller-delivered messages/replies.

Current validation (rerun September 26 after the Tony and Jev merge): 29 tests passed; production build passed; authenticated live API flow passed using synthetic replies. Nine deterministic car cases had zero constraint violations; comparable cases showed $1,300 more reduction than a one-round baseline. Before submission, record these results and an actual process restart. Describe the API as price-and-terms negotiation across domains, not a guarantee that it can negotiate literally anything.

## Recommended resources, not mandatory integrations

The guide recommends MongoDB skills, MCP, and prompting guidance. Relevant MongoDB skills were consulted. No callable MongoDB MCP server was available; the app uses the official Node driver. The guide does not require every partner service, vector search, Voyage embeddings, ElevenLabs, or a specific model provider. OpenAI through OpenRouter is consistent with the guide.

## Event timing

The guide lists submission milestones but no exact submission time or judging rubric. Confirm the deadline with organizers. Top six exhibit September 30 and enter a community vote; top three demo on stage.
