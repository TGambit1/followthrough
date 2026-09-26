# Tony submission packet

Project: **Tony — the deal agent for personal assistants**

Track: **Long Horizon Engineering**

Repository: https://github.com/TGambit1/followthrough

Hosted demo: https://followthrough-umber.vercel.app

Video: **record on-site September 26 and add the link**

## Concise description

Tony is a persistent negotiation API that personal assistants call to get their people the best deals. The assistant gives Tony a target, a private walk-away limit, required terms, and a deadline. Tony prepares firm counters, schedules follow-ups, learns from measured concessions, and preserves the negotiation through interruptions. MongoDB Atlas stores versioned state and a separate event history; GPT-5.6 Luna chooses tactics using bounded working context and numeric feedback. The included car demo uses synthetic dealers and accelerated time to expose stalled replies, repeated counters, and recovery. The assistant delivers drafts through its own channels and reports actual responses. Final approval stays with the person.

## Evidence available

- 29 automated tests passing locally (rerun September 26 after the Tony and Jev merge).
- Production build passing locally.
- Live Atlas and GPT-5.6 Luna API flow passed: authentication, idempotent creation, conflicting replay rejection, two counters, recovery, required terms, and approval.
- Expanded car workflow passed through HTTP with the live model and Atlas.
- Nine deterministic car scenarios: zero constraint violations. In two directly comparable successful cases, multiple rounds reached $27,900 versus $29,200 after one round. These are synthetic outcomes, not real-world savings or a model benchmark.

## Before pressing submit

1. Confirm the Atlas project belongs to the emailed Hackathon Sandbox.
2. ~~Add a publicly accessible hosted demo URL.~~ Done: deployed and verified September 26.
3. Record and upload a one-minute on-site video showing code and functionality built today. Verify audio and video playback.
4. Add the solo team member on Cerebral Valley and submit the repository, video, description, and demo where requested.
5. Confirm the exact submission deadline with organizers.
6. Confirm September 30 attendance at MongoDB.local NYC, 10 AM–4:30 PM, if selected as a finalist.

Do not claim billion-token operation, weeks of live execution, real dealer contact, or guaranteed negotiation outcomes. They have not been demonstrated.
