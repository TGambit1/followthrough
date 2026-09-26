import { db } from "./store";
import { nextDeal, type Deal } from "./deal";
import { planDeal } from "./deal-planner";
import { judgePendingPresentation } from "./present";
import { saveDeal } from "./deal-store";
export async function prepareNegotiationDrafts(limit = 10) {
  if (!process.env.NEGOTIATION_API_KEY || !process.env.MONGODB_URI)
    return { prepared: 0, failed: 0 };
  const now = new Date();
  const deals = await (
    await db()
  )
    .collection<Deal>("negotiation_sessions")
    .find(
      {
        $or: [
          { status: "active" },
          {
            status: "awaiting_reply",
            "pending.nextFollowUpAt": { $lte: now.toISOString() },
          },
          {
            status: "awaiting_reply",
            "spec.deadline": { $lte: now.toISOString() },
          },
        ],
      },
      { projection: { _id: 0 } },
    )
    .sort({ updatedAt: 1 })
    .limit(limit)
    .toArray();
  let prepared = 0,
    failed = 0;
  for (const d of deals) {
    try {
      const judgment = await judgePendingPresentation(d, now);
      const result = nextDeal(d, await planDeal(d), now, judgment);
      if (result) {
        await saveDeal(result.deal, result.event, d.version);
        prepared++;
        console.log(
          `API negotiation ${d.id.slice(0, 8)}: ${result.deal.status}`,
        );
      }
    } catch {
      failed++;
      console.error(
        "API negotiation step failed or checkpoint changed; retry on next worker cycle.",
      );
    }
  }
  return { prepared, failed };
}
