export const PRESENT_THRESHOLD = 0.5;
export type PriceFacts = {
  subject: string;
  direction: "minimize" | "maximize";
  currency: string;
  target: number;
  privateLimit: number;
  price: number;
  requiredTermsMet: boolean;
  roundsUsed: number;
  maxRounds: number;
  terminal: boolean;
};
export type PriceJudgment = {
  source: "jev" | "rules";
  present: boolean;
  probability: number | null;
  model?: string;
  threshold: number;
  inputTokens: number;
};
export type PresentationRecord = {
  source: "jev" | "rules";
  present: boolean;
  probability: number | null;
  model?: string;
  threshold: number;
  amount: number;
  subject: string;
};
export const jevMode = () =>
  process.env.JEV_API_KEY ? "Jev price check" : "Rule price check";
export function withinLimit(facts: PriceFacts) {
  return facts.direction === "minimize"
    ? facts.price <= facts.privateLimit
    : facts.price >= facts.privateLimit;
}
function readNoul(body: unknown) {
  if (!body || typeof body !== "object")
    throw new Error("Jev returned an invalid price decision");
  const root = body as Record<string, unknown>;
  const nested =
    root.result && typeof root.result === "object"
      ? (root.result as Record<string, unknown>)
      : root;
  const answers = nested.answers;
  if (!answers || typeof answers !== "object")
    throw new Error("Jev returned an invalid price decision");
  const answer = (answers as Record<string, unknown>).acceptable_to_present;
  if (!answer || typeof answer !== "object")
    throw new Error("Jev returned an invalid price decision");
  const noul = (answer as Record<string, unknown>).noul;
  if (typeof noul !== "number" || !Number.isFinite(noul) || noul < 0 || noul > 1)
    throw new Error("Jev returned an invalid price decision");
  const usage = (nested.usage ?? root.usage) as
    | { input_tokens?: unknown }
    | undefined;
  const model =
    typeof nested.model === "string"
      ? nested.model
      : typeof root.model === "string"
        ? root.model
        : undefined;
  return {
    noul,
    model,
    inputTokens:
      typeof usage?.input_tokens === "number" ? usage.input_tokens : 0,
  };
}
async function evaluate(facts: PriceFacts) {
  const key = process.env.JEV_API_KEY;
  if (!key) throw new Error("Jev decision unavailable; checkpoint unchanged");
  let delay = 500;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await fetch("https://thejevai.com/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          model: process.env.JEV_MODEL || "jev-latest",
          state: {
            subject: facts.subject,
            direction: facts.direction,
            currency: facts.currency,
            target: facts.target,
            privateLimit: facts.privateLimit,
            price: facts.price,
            gapFromTarget:
              facts.direction === "minimize"
                ? facts.price - facts.target
                : facts.target - facts.price,
            requiredTermsMet: facts.requiredTermsMet,
            roundsUsed: facts.roundsUsed,
            maxRounds: facts.maxRounds,
            terminal: facts.terminal,
          },
          questions: {
            acceptable_to_present: {
              type: "noul",
              instructions:
                "Is this price acceptable to present to the user for their own approval? Yes when it is inside the private limit, required terms are met, and it is close enough to the target to be worth the user's attention. A price that meets the target should be presented. No when it is still far from the target. Presenting is not permission to buy, sell, or transact.",
              criteria: {
                true: "Inside the private limit, required terms met, and close enough to the target to show the user.",
                false:
                  "Too far from the target to interrupt the user with an approval request.",
              },
            },
          },
        }),
      });
    } catch {
      throw new Error("Jev decision unavailable; checkpoint unchanged");
    }
    if (response.status === 429 || response.status === 529) {
      lastStatus = response.status;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      continue;
    }
    if (!response.ok)
      throw new Error(`Jev decision unavailable: HTTP ${response.status}`);
    return readNoul(await response.json());
  }
  throw new Error(`Jev decision unavailable: HTTP ${lastStatus}`);
}
export async function judgePrice(facts: PriceFacts): Promise<PriceJudgment> {
  const threshold = PRESENT_THRESHOLD;
  if (!facts.requiredTermsMet || !withinLimit(facts))
    return {
      source: "rules",
      present: false,
      probability: null,
      threshold,
      inputTokens: 0,
    };
  if (!process.env.JEV_API_KEY)
    return {
      source: "rules",
      present: true,
      probability: null,
      threshold,
      inputTokens: 0,
    };
  const answer = await evaluate(facts);
  return {
    source: "jev",
    present: answer.noul >= threshold,
    probability: answer.noul,
    model: answer.model,
    threshold,
    inputTokens: answer.inputTokens,
  };
}
