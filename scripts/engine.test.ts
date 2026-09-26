import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMission,
  actions,
  advance,
  edit,
  eligible,
  MAX_STEPS,
  type Mission,
  type Event,
} from "../lib/engine";
function step(m: Mission) {
  return advance(m, actions(m)[0], "Test decision");
}
function finish(m: Mission) {
  const events: Event[] = [];
  for (let i = 0; i < MAX_STEPS && m.status === "active"; i++) {
    const r = step(m);
    m = r.mission;
    events.push(r.event);
  }
  assert.notEqual(m.status, "active");
  return { m, events };
}
test("negotiates multiple rounds and follows up instead of accepting first discount", () => {
  const { m, events } = finish(createMission("test"));
  assert.equal(m.status, "approval");
  assert.equal(m.selected, "river");
  const chosen = m.offers.find((o) => o.id === m.selected)!;
  assert.ok(chosen.total! <= m.policy!.targetTotal);
  assert.ok(chosen.negotiation!.rounds > 1);
  assert.equal(m.offers.find((o) => o.id === "park")?.cleanTitle, false);
  assert.ok(events.some((e) => e.kind === "follow_up"));
  assert.ok(m.day > 0);
  assert.equal(
    m.learning.totalReduction,
    m.offers.reduce((sum, o) => sum + (o.originalTotal! - o.total!), 0),
  );
  assert.ok(
    !events.some((e) => e.kind === "negotiate" && e.offerId === "park"),
  );
});
test("changed ceiling below viable prices causes walk-away, not constraint relaxation", () => {
  let { m } = finish(createMission("test"));
  m = edit(m, "brief", 27000, 40000, 26000).mission;
  m = finish(m).m;
  assert.equal(m.status, "blocked");
  assert.equal(m.budget, 27000);
  assert.equal(m.offers.filter((o) => eligible(o, m)).length, 0);
});
test("pending counter survives serialization and resume without a duplicate send", () => {
  let m = createMission("test");
  while (!m.offers.some((o) => o.negotiation?.pending)) m = step(m).mission;
  const pending = structuredClone(
    m.offers.find((o) => o.negotiation?.pending)!.negotiation!.pending,
  );
  const actionsBefore = actions(m);
  m = edit(m, "pause").mission;
  assert.deepEqual(actions(m), []);
  m = edit(JSON.parse(JSON.stringify(m)), "resume").mission;
  assert.deepEqual(
    m.offers.find((o) => o.negotiation?.pending)!.negotiation!.pending,
    pending,
  );
  assert.deepEqual(actions(m), actionsBefore);
  const { events } = finish(m);
  const sent = events.filter(
    (e) =>
      e.kind === "negotiate" &&
      e.round === pending!.round &&
      e.offerId === "north",
  );
  assert.equal(sent.length, 0);
});
test("follow-up holds price and outbound messages do not reveal ceiling", () => {
  const { events } = finish(createMission("test"));
  const counters = new Map<string, number>();
  for (const e of events) {
    if (e.speaker === "buyer") {
      assert.ok(!e.detail.includes("32,000"));
      assert.ok(!/my (budget|ceiling)/i.test(e.detail));
    }
    if (e.kind === "negotiate")
      counters.set(`${e.offerId}:${e.round}`, e.counterTotal!);
    if (e.kind === "follow_up")
      assert.equal(e.counterTotal, counters.get(`${e.offerId}:${e.round}`));
  }
});
test("competitor claims come from verified current alternatives", () => {
  const { events } = finish(createMission("test"));
  for (const e of events.filter((e) =>
    e.detail.includes("written alternative:"),
  )) {
    assert.ok(!e.detail.includes("2022 Toyota"));
    assert.match(e.detail, /different vehicle/);
  }
});
test("round cap and deadline bound negotiations", () => {
  const start = createMission("test");
  start.policy!.targetTotal = 20000;
  start.policy!.maxRounds = 2;
  const { m } = finish(start);
  assert.equal(m.status, "approval");
  assert.ok(m.offers.every((o) => o.negotiation!.rounds <= 2));
  assert.ok(
    m.offers.find((o) => o.id === m.selected)!.total! > m.policy!.targetTotal,
  );
  const expired = createMission("expired");
  expired.offers = structuredClone(m.offers);
  expired.day = expired.policy!.deadlineDay;
  assert.deepEqual(
    actions(expired).map((a) => a.kind),
    ["decide"],
  );
});
test("goal edits cancel pending counters, preserve round counts and invalidate approvals", () => {
  let m = createMission("test");
  while (!m.offers.some((o) => o.negotiation?.pending)) m = step(m).mission;
  const count = m.offers.reduce((n, o) => n + o.negotiation!.rounds, 0);
  m = edit(m, "brief", 29000, 40000, 27000).mission;
  assert.ok(m.offers.every((o) => !o.negotiation!.pending));
  assert.equal(
    m.offers.reduce((n, o) => n + o.negotiation!.rounds, 0),
    count,
  );
  assert.throws(() => edit(m, "approve"));
});
test("stale actions, invalid target, expired offers and unsafe approval are rejected", () => {
  let m = createMission("test");
  const a = actions(m)[0];
  m = advance(m, a, "").mission;
  assert.throws(() => advance(m, a, ""));
  assert.throws(() => edit(m, "brief", 30000, 40000, 31000));
  m = finish(m).m;
  m.day = 100;
  assert.throws(() => edit(m, "approve"));
});
test("mileage changes exclude unsuitable cars", () => {
  let m = finish(createMission("test")).m;
  m = edit(m, "brief", 32000, 17000).mission;
  m = finish(m).m;
  assert.equal(m.status, "blocked");
});
test("approval records packet approval only", () => {
  const { m } = finish(createMission("test"));
  const r = edit(m, "approve");
  assert.equal(r.mission.status, "approved");
  assert.match(r.event.detail, /not connected/);
});
