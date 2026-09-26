export type Tactic =
  | "remove_addons"
  | "anchor"
  | "competing_offer"
  | "final_counter";
export type Policy = {
  targetTotal: number;
  maxRounds: number;
  maxFollowUps: number;
  followUpDays: number;
  deadlineDay: number;
  maxStalls: number;
};
export type Pending = {
  round: number;
  tactic: Tactic;
  counterTotal: number;
  requestedDay: number;
  replyDueDay: number | null;
  followUpDueDay: number;
  followUps: number;
  message: string;
  reference?: { car: string; total: number; offerId: string };
};
export type Negotiation = {
  rounds: number;
  followUps: number;
  stalls: number;
  pending?: Pending;
  stopReason?: string;
  lastBuyerMessage?: string;
  lastDealerMessage?: string;
  lastCounter?: number;
  lastReduction: number;
};
export type TacticResult = { attempts: number; reduction: number };
export const defaultNegotiation = (): Negotiation => ({
  rounds: 0,
  followUps: 0,
  stalls: 0,
  lastReduction: 0,
});
export const defaultPolicy = (budget: number): Policy => ({
  targetTotal: Math.floor((budget * 0.875) / 50) * 50,
  maxRounds: 4,
  maxFollowUps: 2,
  followUpDays: 1,
  deadlineDay: 14,
  maxStalls: 2,
});
export const tacticLabels: Record<Tactic, string> = {
  remove_addons: "Remove optional add-ons",
  anchor: "Make a firm price counter",
  competing_offer: "Use a verified alternative",
  final_counter: "Request a final written total",
};
const money = (n: number) => "$" + n.toLocaleString("en-US");
// Outbound text deliberately has no buyer ceiling or model-generated claims. The model
// chooses a validated tactic; these templates ground every factual claim in saved evidence.
export function buyerMessage(car: string, total: number, p: Pending): string {
  const reference = p.reference
    ? `I have a written alternative: ${p.reference.car} at ${money(p.reference.total)} all-in. It is a different vehicle, so this is an alternative purchase, not an identical-car price match. `
    : "";
  const approach: Record<Tactic, string> = {
    remove_addons:
      "Remove the optional add-ons. Itemize the vehicle price, tax, registration, and every remaining fee. ",
    anchor:
      "There is still a gap between your price and a deal worth pursuing. ",
    competing_offer: reference,
    final_counter:
      "Please have the person authorized to approve pricing review this counter and provide your best written total. ",
  };
  return `Your written total for the ${car} is ${money(total)}. ${approach[p.tactic]}My counter is ${money(p.counterTotal)} out the door, including all fees, with no required extras. If that does not work, give me a concrete revised total. I am prepared to pass. Any purchase remains subject to the buyer’s review and approval.`;
}
export function followUpMessage(p: Pending): string {
  return `Following up on my ${money(p.counterTotal)} out-the-door counter. I have not raised it. Please respond with an itemized written total and confirm whether optional extras are required. Without a substantive reply, I will stop pursuing this offer.`;
}
