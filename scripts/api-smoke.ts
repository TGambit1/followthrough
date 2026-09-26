import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const url = "http://localhost:3100/api/negotiations";
const key = process.env.NEGOTIATION_API_KEY;
async function main() {
  assert.ok(key, "NEGOTIATION_API_KEY required");
  assert.equal((await fetch(url)).status, 401);
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Idempotency-Key": `api-smoke-${randomUUID()}`,
  };
  async function post(body: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await r.json();
    assert.ok(r.ok, JSON.stringify(data));
    return data;
  }
  const create = {
    command: "create",
    spec: {
      subject: "Synthetic annual software contract, 10 seats",
      counterparty: "Synthetic vendor",
      direction: "minimize",
      currency: "USD",
      initialOffer: 15000,
      target: 10000,
      limit: 12000,
      requiredTerms: ["No auto-renewal"],
      maxRounds: 4,
    },
  };
  let result = await post(create);
  let d = result.deal;
  const id = d.id;
  assert.equal((await post(create)).deal.id, id);
  const badReplay = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...create, spec: { ...create.spec, target: 9000 } }),
  });
  assert.equal(badReplay.status, 409);
  async function command(command: string, extra: Record<string, unknown> = {}) {
    const r = await post({ command, id, version: d.version, ...extra });
    d = r.deal;
    return r;
  }
  await command("next");
  assert.equal(d.status, "draft_ready");
  assert.ok(d.pending.text.includes("9,500"));
  assert.ok(!d.pending.text.includes("12,000"));
  const draftId = d.pending.id;
  await command("pause");
  await command("resume");
  assert.equal(d.pending.id, draftId);
  const recovered = await (await fetch(`${url}?id=${id}`, { headers })).json();
  assert.equal(recovered.deal.pending.id, draftId);
  await command("mark_sent", { draftId, deliveryId: "synthetic-delivery-1" });
  await command("reply", {
    draftId,
    amount: 11500,
    acceptedTerms: ["No auto-renewal"],
    sourceId: "synthetic-quote-1",
    message: "Synthetic vendor offers 11,500 on the same annual basis.",
  });
  await command("next");
  assert.equal(d.status, "draft_ready");
  assert.equal(d.rounds, 2);
  await command("mark_sent", {
    draftId: d.pending.id,
    deliveryId: "synthetic-delivery-2",
  });
  await command("reply", {
    draftId: d.pending.id,
    amount: 10000,
    acceptedTerms: ["No auto-renewal"],
    sourceId: "synthetic-quote-2",
    message: "Synthetic vendor offers 10,000 on the same annual basis.",
  });
  await command("next");
  assert.equal(d.status, "needs_approval");
  await command("approve");
  assert.equal(d.status, "approved");
  console.log(
    JSON.stringify({
      passed: true,
      storage: "Atlas",
      model: process.env.MODEL_NAME,
      negotiationId: id,
      rounds: d.rounds,
      improvement: d.spec.initialOffer - d.latestOffer,
      tokens: d.tokens,
      checks: [
        "API auth",
        "idempotent creation",
        "replay conflict",
        "private limit withheld",
        "pause/resume",
        "durable draft",
        "multi-round counter",
        "required terms",
        "human approval",
      ],
      disclosure: "Synthetic vendor replies; no external messages delivered.",
    }),
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "API smoke failed");
  process.exitCode = 1;
});
