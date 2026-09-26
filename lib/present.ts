import {
  negotiationCanContinue,
  presentationCandidate,
  type Deal,
} from "./deal";
import { judgePrice, type PriceJudgment } from "./jev";
export async function judgePendingPresentation(
  d: Deal,
  now = new Date(),
): Promise<PriceJudgment | undefined> {
  if (!presentationCandidate(d, now)) return undefined;
  return judgePrice({
    subject: d.spec.subject,
    direction: d.spec.direction,
    currency: d.spec.currency,
    target: d.spec.target,
    privateLimit: d.spec.limit,
    price: d.latestOffer,
    requiredTermsMet: true,
    roundsUsed: d.rounds,
    maxRounds: d.spec.maxRounds,
    terminal: !negotiationCanContinue(d, now),
  });
}
