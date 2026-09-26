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
        <strong>The table</strong>
        <span>
          Round {n.rounds}/{policy?.maxRounds ?? 4} · {n.followUps} follow-ups
        </span>
      </div>
      <div className="negotiation-stats">
        <span>
          Our number{" "}
          <b>{n.lastCounter ? money(n.lastCounter) : "Coming"}</b>
        </span>
        <span>
          Off the top{" "}
          <b>{money((o.originalTotal ?? o.total ?? 0) - (o.total ?? 0))}</b>
        </span>
      </div>
      {n.lastBuyerMessage && (
        <details open={!!n.pending}>
          <summary>What we told them · simulated</summary>
          <blockquote>{n.lastBuyerMessage}</blockquote>
        </details>
      )}
      {n.lastDealerMessage && (
        <details>
          <summary>What they came back with · simulated</summary>
          <blockquote>{n.lastDealerMessage}</blockquote>
        </details>
      )}
      {n.pending ? (
        <p className="pending-reply">
          Waiting on round {n.pending.round} · next nudge, day{" "}
          {n.pending.followUpDueDay}
          {n.pending.followUpDueDay <= day ? " (due)" : ""}
        </p>
      ) : n.stopReason ? (
        <p className="negotiation-stop">{n.stopReason}</p>
      ) : (
        <p className="pending-reply">
          {o.cleanTitle === false
            ? "Title’s dirty. We walk."
            : "We stay until our number, or we walk."}
        </p>
      )}
    </div>
  );
}
