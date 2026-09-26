import { test } from "node:test";
import assert from "node:assert/strict";
import { judgePrice, PRESENT_THRESHOLD, type PriceFacts } from "../lib/jev";
const facts: PriceFacts = {
  subject: "2023 Honda Civic EX",
  direction: "minimize",
  currency: "USD",
  target: 28000,
  privateLimit: 32000,
  price: 27900,
  requiredTermsMet: true,
  roundsUsed: 3,
  maxRounds: 4,
  terminal: true,
};
async function withFetch(
  key: string | undefined,
  impl: typeof fetch,
  run: () => Promise<void>,
) {
  const previousKey = process.env.JEV_API_KEY;
  const previousFetch = globalThis.fetch;
  if (key === undefined) delete process.env.JEV_API_KEY;
  else process.env.JEV_API_KEY = key;
  globalThis.fetch = impl;
  try {
    await run();
  } finally {
    if (previousKey === undefined) delete process.env.JEV_API_KEY;
    else process.env.JEV_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
}
test("rules present an in-limit price when Jev is not configured", async () => {
  await withFetch(undefined, async () => {
    throw new Error("fetch should not run");
  }, async () => {
    const judgment = await judgePrice(facts);
    assert.equal(judgment.source, "rules");
    assert.equal(judgment.present, true);
    assert.equal(judgment.probability, null);
    assert.equal(judgment.threshold, PRESENT_THRESHOLD);
  });
});
test("code refuses an over-limit price before calling Jev", async () => {
  let called = false;
  await withFetch("test-key", async () => {
    called = true;
    throw new Error("fetch should not run");
  }, async () => {
    const judgment = await judgePrice({ ...facts, price: 33000 });
    assert.equal(called, false);
    assert.equal(judgment.present, false);
    assert.equal(judgment.source, "rules");
  });
});
test("Jev yes-probability at the threshold presents the price", async () => {
  await withFetch("test-key", async () => {
    return new Response(
      JSON.stringify({
        model: "jev-1.13.0",
        answers: { acceptable_to_present: { type: "noul", noul: 0.5 } },
        usage: { input_tokens: 120, output_tokens: 8 },
      }),
    );
  }, async () => {
    const judgment = await judgePrice(facts);
    assert.equal(judgment.source, "jev");
    assert.equal(judgment.present, true);
    assert.equal(judgment.probability, 0.5);
    assert.equal(judgment.model, "jev-1.13.0");
    assert.equal(judgment.inputTokens, 120);
  });
});
test("Jev yes-probability below the threshold withholds the price", async () => {
  await withFetch("test-key", async () => {
    return new Response(
      JSON.stringify({
        result: {
          model: "jev-1.13.0",
          answers: { acceptable_to_present: { type: "noul", noul: 0.49 } },
          usage: { input_tokens: 80 },
        },
      }),
    );
  }, async () => {
    const judgment = await judgePrice(facts);
    assert.equal(judgment.present, false);
    assert.equal(judgment.probability, 0.49);
  });
});
test("Jev errors leave the checkpoint unchanged", async () => {
  await withFetch("test-key", async () => new Response("no", { status: 401 }), async () => {
    await assert.rejects(() => judgePrice(facts), /Jev decision unavailable: HTTP 401/);
  });
});
