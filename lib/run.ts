import {
  advance,
  actions,
  bestEligibleOffer,
  MAX_STEPS,
  normalizeMission,
  type Mission,
} from "./engine";
import { reserveDemoModelCall } from "./demo-budget";
import { judgePrice } from "./jev";
import { plan } from "./planner";
import { save } from "./store";
export async function runStep(m: Mission) {
  if (m.steps >= MAX_STEPS)
    throw new Error(
      "Mission reached its 100-step demo budget. Create a new mission.",
    );
  const available = actions(m);
  const forced =
    available.length === 1 &&
    ["wait", "reply", "follow_up", "close", "decide"].includes(
      available[0].kind,
    );
  if (!forced && process.env.MODEL_API_KEY) await reserveDemoModelCall();
  const decision = forced
    ? { action: available[0], rationale: available[0].label, tokens: 0 }
    : await plan(m);
  const current = normalizeMission(m);
  const best =
    decision.action.kind === "decide" ? bestEligibleOffer(current) : undefined;
  const judgment = best
    ? await judgePrice({
        subject: best.car,
        direction: "minimize",
        currency: "USD",
        target: current.policy!.targetTotal,
        privateLimit: current.budget,
        price: best.total!,
        requiredTermsMet: true,
        roundsUsed: best.negotiation?.rounds ?? 0,
        maxRounds: current.policy!.maxRounds,
        terminal: true,
      })
    : undefined;
  const result = advance(m, decision.action, decision.rationale, judgment);
  result.mission.tokens += decision.tokens;
  // Optimistic checkpoint commit prevents concurrent workers from recording duplicate simulated actions.
  // A live dealer adapter would require its own idempotency key and reconciliation.
  await save(result.mission, result.event, m.version);
  return result.mission;
}
