import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateSpec,
  createDeal,
  nextDeal,
  commandDeal,
  improvement,
  type Deal,
} from "../lib/deal";
const now = new Date("2026-09-26T12:00:00Z");
const decision = {
  tactic: "itemize" as const,
  rationale: "Challenge fees",
  tokens: 10,
};
function make(direction: "minimize" | "maximize" = "minimize") {
  return createDeal(
    "abc",
    validateSpec(
      {
        subject: "Annual software contract",
        counterparty: "Example vendor",
        direction,
        currency: "USD",
        target: direction === "minimize" ? 10000 : 150000,
        limit: direction === "minimize" ? 12000 : 130000,
        initialOffer: direction === "minimize" ? 15000 : 120000,
        requiredTerms: ["No auto-renewal"],
        followUpHours: 1,
        maxFollowUps: 1,
      },
      now,
    ),
    now,
  );
}
function sent(d: Deal) {
  return commandDeal(
    d,
    { command: "mark_sent", draftId: d.pending!.id, deliveryId: "receipt-1" },
    now,
  ).deal;
}
function reply(d: Deal, amount: number, terms: string[] = ["No auto-renewal"]) {
  return commandDeal(
    d,
    {
      command: "reply",
      draftId: d.pending!.id,
      amount,
      acceptedTerms: terms,
      sourceId: "quote-1",
      message: "Written offer supplied by caller",
    },
    now,
  ).deal;
}
test("API drafts counters for buying and compensation negotiations within private limits", () => {
  const buy = nextDeal(make(), decision, now)!.deal;
  assert.equal(buy.pending!.amount, 9500);
  assert.ok(!buy.pending!.text.includes("12,000"));
  const sell = nextDeal(make("maximize"), decision, now)!.deal;
  assert.equal(sell.pending!.amount, 157500);
  assert.ok(!sell.pending!.text.includes("130,000"));
});
test("draft generation is idempotent until delivery and does not imply sending", () => {
  const d = nextDeal(make(), decision, now)!.deal;
  assert.equal(d.status, "draft_ready");
  assert.equal(d.pending!.sentAt, undefined);
  assert.equal(nextDeal(d, decision, now), null);
  assert.throws(() => reply(d, 10000));
  assert.throws(() =>
    commandDeal(
      d,
      { command: "mark_sent", draftId: "wrong", deliveryId: "receipt" },
      now,
    ),
  );
});
test("follow-up survives restart, waits until due, holds the counter and stops at cap", () => {
  let d = sent(nextDeal(make(), decision, now)!.deal);
  d = JSON.parse(JSON.stringify(d));
  assert.equal(nextDeal(d, decision, new Date(+now + 3599000)), null);
  d = nextDeal(d, decision, new Date(+now + 3600000))!.deal;
  assert.equal(d.pending!.kind, "follow_up");
  assert.equal(d.pending!.amount, 9500);
  assert.equal(d.rounds, 1);
  d = commandDeal(
    d,
    { command: "mark_sent", draftId: d.pending!.id, deliveryId: "receipt-2" },
    new Date(+now + 3600000),
  ).deal;
  d = nextDeal(d, decision, new Date(+now + 7200000))!.deal;
  assert.equal(d.status, "walked_away");
});
test("target and caller-reported required terms are both needed for approval", () => {
  let d = reply(sent(nextDeal(make(), decision, now)!.deal), 10000, []);
  d = nextDeal(d, decision, now)!.deal;
  assert.equal(d.status, "draft_ready");
  d = reply(sent(d), 10000);
  d = nextDeal(d, decision, now)!.deal;
  assert.equal(d.status, "needs_approval");
  assert.equal(improvement(d), 5000);
  const approved = commandDeal(d, { command: "approve" }, now);
  assert.equal(approved.deal.status, "approved");
  assert.match(approved.event.detail, /No payment/);
});
test("no progress stops persistent negotiation rather than looping forever", () => {
  let d = make();
  for (let i = 0; i < 2; i++)
    d = reply(sent(nextDeal(d, decision, now)!.deal), 15000, []);
  d = nextDeal(d, decision, now)!.deal;
  assert.equal(d.status, "walked_away");
  assert.equal(d.stalls, 2);
});
test("revisions invalidate pending draft and preserve effort and baseline", () => {
  let d = nextDeal(make(), decision, now)!.deal;
  d = commandDeal(
    d,
    { command: "revise", spec: { target: 9000, limit: 11000 } },
    now,
  ).deal;
  assert.equal(d.pending, undefined);
  assert.equal(d.rounds, 1);
  assert.equal(d.spec.initialOffer, 15000);
  assert.equal(d.spec.target, 9000);
});
test("pause and resume retain pending deadlines", () => {
  let d = sent(nextDeal(make(), decision, now)!.deal);
  const due = d.pending!.nextFollowUpAt;
  d = commandDeal(d, { command: "pause" }, now).deal;
  assert.equal(nextDeal(d, decision, now), null);
  d = commandDeal(d, { command: "resume" }, now).deal;
  assert.equal(d.status, "awaiting_reply");
  assert.equal(d.pending!.nextFollowUpAt, due);
});
test("invalid limits, stale reply references and expired approval are rejected", () => {
  assert.throws(() =>
    validateSpec({ direction: "minimize", target: 20, limit: 10 }, now),
  );
  const d = sent(nextDeal(make(), decision, now)!.deal);
  assert.throws(() =>
    commandDeal(
      d,
      {
        command: "reply",
        draftId: "wrong",
        amount: 9000,
        sourceId: "x",
        message: "x",
      },
      now,
    ),
  );
  const ready = nextDeal(reply(d, 10000), decision, now)!.deal;
  assert.throws(() =>
    commandDeal(ready, { command: "approve" }, new Date("2026-10-10")),
  );
});
test("drafts introduce Tony and the represented principal", () => {
  const d = nextDeal(make(), decision, now)!.deal;
  assert.match(
    d.pending!.text,
    /^This is Tony, negotiating on behalf of my client\. /,
  );
  const named = createDeal(
    "named",
    validateSpec({ ...make().spec, onBehalfOf: "Jordan Lee" }, now),
    now,
  );
  const draft = nextDeal(named, decision, now)!.deal.pending!;
  assert.match(
    draft.text,
    /^This is Tony, negotiating on behalf of Jordan Lee\. /,
  );
  assert.throws(() => validateSpec({ ...make().spec, onBehalfOf: "" }, now));
});
