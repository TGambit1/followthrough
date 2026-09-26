import {
  createMission,
  actions,
  advance,
  edit,
  eligible,
  MAX_STEPS,
  type Mission,
} from "../lib/engine";
function finish(m: Mission) {
  while (m.status === "active" && m.steps < MAX_STEPS)
    m = advance(m, actions(m)[0], "Evaluation: deterministic planner").mission;
  return m;
}
const rows = [];
for (const budget of [27000, 28000, 32000])
  for (const maxMiles of [17000, 19000, 40000]) {
    const single = createMission("single", budget, maxMiles);
    single.policy!.targetTotal = Math.min(28000, budget);
    single.policy!.maxRounds = 1;
    const baseline = finish(single);
    let durable = createMission("durable");
    for (let i = 0; i < 4; i++)
      durable = advance(durable, actions(durable)[0], "Evaluation").mission;
    durable = edit(
      durable,
      "brief",
      budget,
      maxMiles,
      Math.min(28000, budget),
    ).mission;
    durable = edit(durable, "pause").mission;
    durable = edit(JSON.parse(JSON.stringify(durable)), "resume").mission;
    durable = finish(durable);
    const first = baseline.offers.find((o) => o.id === baseline.selected),
      best = durable.offers.find((o) => o.id === durable.selected);
    rows.push({
      budget,
      maxMiles,
      singleRoundPrice: first?.total ?? null,
      persistentPrice: best?.total ?? null,
      persistentStatus: durable.status,
      constraintViolation: !!best && !eligible(best, durable),
      additionalReduction: first && best ? first.total! - best.total! : null,
    });
  }
console.log(
  JSON.stringify(
    {
      disclosure:
        "Synthetic deterministic comparison using the same dealer adapter. One round versus up to four rounds plus durable goal changes/recovery. This is not a model benchmark or proof of real-world savings.",
      cases: rows.length,
      constraintViolations: rows.filter((x) => x.constraintViolation).length,
      rows,
    },
    null,
    2,
  ),
);
