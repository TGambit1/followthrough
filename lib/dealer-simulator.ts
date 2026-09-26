import type { Pending } from "./negotiation";
// Fictional dealer economics, isolated from the model's context and outbound messages.
// The adapter responds to the tactic and counter; it is not a real dealer connection.
const dealers: Record<
  string,
  { floor: number; initial: number; addons: number }
> = {
  north: { floor: 28250, initial: 31650, addons: 1800 },
  river: { floor: 27900, initial: 30100, addons: 900 },
  park: { floor: 26500, initial: 27800, addons: 400 },
};
export function simulatedQuote(id: string) {
  const d = dealers[id];
  if (!d) throw new Error("Unknown synthetic dealer");
  return { total: d.initial, optionalAddons: d.addons };
}
export function simulatedReply(
  id: string,
  total: number,
  addons: number,
  p: Pending,
) {
  const d = dealers[id];
  if (!d) throw new Error("Unknown synthetic dealer");
  let concession = 0;
  if (p.tactic === "remove_addons") concession = addons;
  else if (p.tactic === "anchor")
    concession = Math.min(
      700,
      Math.max(0, Math.round(((total - p.counterTotal) * 0.45) / 50) * 50),
    );
  else if (p.tactic === "competing_offer" && p.reference)
    concession = Math.min(
      900,
      Math.max(0, Math.round(((total - p.counterTotal) * 0.6) / 50) * 50),
    );
  else if (p.tactic === "final_counter")
    concession = Math.min(
      600,
      Math.max(0, Math.round(((total - p.counterTotal) * 0.5) / 50) * 50),
    );
  const next = Math.min(
    total,
    Math.max(d.floor, p.counterTotal, total - concession),
  );
  const reduction = total - next;
  return {
    total: next,
    reduction,
    optionalAddons:
      p.tactic === "remove_addons" ? Math.max(0, addons - reduction) : addons,
    message:
      reduction > 0
        ? `We can offer $${next.toLocaleString("en-US")} out the door. ${p.tactic === "remove_addons" ? "The optional add-ons have been reduced or removed. " : ""}This is our revised written quote, including tax and fees.`
        : `We cannot reduce the written total below $${total.toLocaleString("en-US")}. No further concession in this response.`,
  };
}
