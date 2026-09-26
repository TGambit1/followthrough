import type { Offer } from "@/lib/engine";
import type { Policy } from "@/lib/negotiation";
const money = (n: number) => "$" + n.toLocaleString("en-US");
export function NegotiationCard({
  offer: o,
  policy,
  day,
}: {
  offer: Offer;
  policy?: Policy;
  day: number;
}) {
  const n = o.negotiation;
  if (!n || !o.quoted) return null;
  return (
    <div className="negotiation-box">
      <div className="negotiation-heading">
        <strong>Negotiation desk</strong>
        <span>
          Round {n.rounds}/{policy?.maxRounds ?? 4} · {n.followUps} follow-ups
        </span>
      </div>
      <div className="negotiation-stats">
        <span>
          Our counter{" "}
          <b>{n.lastCounter ? money(n.lastCounter) : "Preparing"}</b>
        </span>
        <span>
          Quote reduction{" "}
          <b>{money((o.originalTotal ?? o.total ?? 0) - (o.total ?? 0))}</b>
        </span>
      </div>
      {n.lastBuyerMessage && (
        <details open={!!n.pending}>
          <summary>Our latest message · simulated</summary>
          <blockquote>{n.lastBuyerMessage}</blockquote>
        </details>
      )}
      {n.lastDealerMessage && (
        <details>
          <summary>Dealer’s latest response · simulated</summary>
          <blockquote>{n.lastDealerMessage}</blockquote>
        </details>
      )}
      {n.pending ? (
        <p className="pending-reply">
          ◷ Awaiting round {n.pending.round} reply · next follow-up day{" "}
          {n.pending.followUpDueDay}
          {n.pending.followUpDueDay <= day ? " (due)" : ""}
        </p>
      ) : n.stopReason ? (
        <p className="negotiation-stop">{n.stopReason}</p>
      ) : (
        <p className="pending-reply">
          {o.cleanTitle === false
            ? "Walk away: title failed."
            : "Continue until target or stop limit."}
        </p>
      )}
    </div>
  );
}
