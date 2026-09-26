import {
  defaultNegotiation,
  defaultPolicy,
  buyerMessage,
  followUpMessage,
  tacticLabels,
  type Negotiation,
  type Policy,
  type Tactic,
  type TacticResult,
} from "./negotiation";
import { simulatedQuote, simulatedReply } from "./dealer-simulator";
export type Offer = {
  id: string;
  dealer: string;
  car: string;
  miles: number;
  advertised: number;
  total?: number;
  originalTotal?: number;
  quoted: boolean;
  negotiated: boolean;
  verified: boolean;
  cleanTitle?: boolean;
  expiresDay?: number;
  evidence: string;
  optionalAddons?: number;
  negotiation?: Negotiation;
};
export type Mission = {
  id: string;
  version: number;
  budget: number;
  maxMiles: number;
  day: number;
  status: "active" | "paused" | "approval" | "approved" | "blocked";
  offers: Offer[];
  selected?: string;
  created: string;
  updated: string;
  steps: number;
  recoveries: number;
  tokens: number;
  policy?: Policy;
  nextWakeAt?: string;
  learning: {
    itemizedFirst: boolean;
    observations: number;
    totalReduction: number;
    tactics?: Partial<Record<Tactic, TacticResult>>;
  };
  lastDecision: string;
};
export type Event = {
  id: string;
  missionId: string;
  version: number;
  day: number;
  at: string;
  kind: string;
  title: string;
  detail: string;
  actionKey?: string;
  offerId?: string;
  round?: number;
  counterTotal?: number;
  resultingTotal?: number;
  reduction?: number;
  speaker?: "buyer" | "dealer";
};
export type Action = {
  kind:
    | "discover"
    | "quote"
    | "negotiate"
    | "reply"
    | "follow_up"
    | "close"
    | "wait"
    | "verify"
    | "decide";
  offerId?: string;
  tactic?: Tactic;
  label: string;
};
export const MAX_STEPS = 100;
export const catalog: Offer[] = [
  {
    id: "north",
    dealer: "Northstar Motors",
    car: "2023 Toyota Corolla Hybrid",
    miles: 21800,
    advertised: 25900,
    quoted: false,
    negotiated: false,
    verified: false,
    evidence: "Synthetic listing · N-104",
  },
  {
    id: "river",
    dealer: "Riverside Auto",
    car: "2023 Honda Civic EX",
    miles: 18400,
    advertised: 27100,
    quoted: false,
    negotiated: false,
    verified: false,
    evidence: "Synthetic listing · R-208",
  },
  {
    id: "park",
    dealer: "Parkway Certified",
    car: "2022 Toyota Corolla Hybrid",
    miles: 31200,
    advertised: 24800,
    quoted: false,
    negotiated: false,
    verified: false,
    evidence: "Synthetic listing · P-311",
  },
];
export function normalizeMission(input: Mission): Mission {
  const m = structuredClone(input);
  m.policy ??= defaultPolicy(m.budget);
  m.learning.tactics ??= {};
  for (const o of m.offers) {
    o.negotiation ??= { ...defaultNegotiation(), rounds: o.negotiated ? 1 : 0 };
    o.optionalAddons ??= 0;
  }
  return m;
}
export function createMission(
  id: string,
  budget = 32000,
  maxMiles = 40000,
): Mission {
  const now = new Date().toISOString();
  return {
    id,
    version: 0,
    budget,
    maxMiles,
    day: 0,
    status: "active",
    offers: [],
    created: now,
    updated: now,
    steps: 0,
    recoveries: 0,
    tokens: 0,
    policy: defaultPolicy(budget),
    nextWakeAt: now,
    learning: {
      itemizedFirst: false,
      observations: 0,
      totalReduction: 0,
      tactics: {},
    },
    lastDecision:
      "Pursue the target price with firm, evidence-backed counters. Keep the buyer’s ceiling private and require written all-in totals.",
  };
}
export function eligible(o: Offer, m: Mission) {
  return (
    o.total !== undefined &&
    o.total <= m.budget &&
    o.miles <= m.maxMiles &&
    o.cleanTitle === true &&
    o.verified &&
    (o.expiresDay ?? -1) >= m.day
  );
}
function alternative(m: Mission, o: Offer) {
  return m.offers
    .filter((x) => x.id !== o.id && eligible(x, m) && x.total! < o.total!)
    .sort((a, b) => a.total! - b.total!)[0];
}
export function stopReason(m: Mission, o: Offer): string | undefined {
  const p = m.policy ?? defaultPolicy(m.budget),
    n = o.negotiation ?? defaultNegotiation();
  if (m.day >= p.deadlineDay) return "Negotiation deadline reached";
  if (o.verified && !o.cleanTitle) return "Branded title — walk away";
  if (o.miles > m.maxMiles) return "Mileage exceeds the current brief";
  if (n.pending) return undefined;
  if (o.total !== undefined && o.total <= p.targetTotal)
    return "Target price reached";
  if (n.stalls >= p.maxStalls) return "Dealer stalled — no further progress";
  if (n.rounds >= p.maxRounds) return "Counteroffer round limit reached";
  return n.stopReason;
}
export function actions(input: Mission): Action[] {
  const m = normalizeMission(input),
    p = m.policy!;
  if (m.status !== "active") return [];
  if (!m.offers.length)
    return [
      { kind: "discover", label: "Find cars matching the purchase brief" },
    ];
  if (m.day >= p.deadlineDay)
    return [
      {
        kind: "decide",
        label:
          "Deadline reached: review the best verified offer without further counters",
      },
    ];
  const quotes = m.offers
    .filter((o) => !o.quoted)
    .map((o) => ({
      kind: "quote" as const,
      offerId: o.id,
      label: `Get an itemized quote from ${o.dealer}`,
    }));
  if (quotes.length) return quotes;
  const checks = m.offers
    .filter((o) => !o.verified && o.miles <= m.maxMiles)
    .map((o) => ({
      kind: "verify" as const,
      offerId: o.id,
      label: `Check the title before spending effort negotiating with ${o.dealer}`,
    }));
  if (checks.length) return checks;
  const due: Action[] = [];
  const counters: Action[] = [];
  for (const o of m.offers) {
    const n = o.negotiation!;
    if (o.cleanTitle !== true || o.miles > m.maxMiles) continue;
    if (n.pending) {
      const pending = n.pending;
      if (pending.replyDueDay !== null && pending.replyDueDay <= m.day)
        due.push({
          kind: "reply",
          offerId: o.id,
          label: `Read ${o.dealer}'s written response to round ${pending.round}`,
        });
      else if (pending.followUpDueDay <= m.day)
        due.push(
          pending.followUps < p.maxFollowUps
            ? {
                kind: "follow_up",
                offerId: o.id,
                label: `Follow up with ${o.dealer}; hold the same counter`,
              }
            : {
                kind: "close",
                offerId: o.id,
                label: `Walk away from ${o.dealer} after unanswered follow-ups`,
              },
        );
      continue;
    }
    if (stopReason(m, o)) continue;
    let tactics: Tactic[];
    if ((o.optionalAddons ?? 0) > 0) tactics = ["remove_addons"];
    else if (n.rounds === p.maxRounds - 1) tactics = ["final_counter"];
    else
      tactics = alternative(m, o) ? ["competing_offer", "anchor"] : ["anchor"];
    for (const tactic of tactics)
      counters.push({
        kind: "negotiate",
        offerId: o.id,
        tactic,
        label: `${o.dealer}, round ${n.rounds + 1}: ${tacticLabels[tactic]}`,
      });
  }
  if (due.length) return due;
  if (counters.length) return counters;
  if (m.offers.some((o) => o.negotiation?.pending))
    return [
      {
        kind: "wait",
        label: "Advance simulated time to the next reply or follow-up",
      },
    ];
  return [
    {
      kind: "decide",
      label:
        "Review negotiation outcomes against the target and private ceiling",
    },
  ];
}
function nextDue(m: Mission) {
  const days = m.offers
    .flatMap((o) => {
      const x = o.negotiation?.pending;
      return x
        ? [x.followUpDueDay, ...(x.replyDueDay === null ? [] : [x.replyDueDay])]
        : [];
    })
    .filter((d) => d > m.day);
  return Math.min(m.policy!.deadlineDay, ...days);
}
export function advance(
  input: Mission,
  action: Action,
  rationale: string,
): { mission: Mission; event: Event } {
  const m = normalizeMission(input);
  if (
    !actions(m).some(
      (a) =>
        a.kind === action.kind &&
        a.offerId === action.offerId &&
        a.tactic === action.tactic,
    )
  )
    throw new Error(
      "That action is no longer available. Reload the current checkpoint.",
    );
  m.version++;
  m.steps++;
  m.updated = new Date().toISOString();
  m.nextWakeAt = new Date(Date.now() + 5000).toISOString();
  m.lastDecision = rationale;
  let detail = "";
  let title = action.label;
  const extra: Partial<Event> = {};
  const o = m.offers.find((x) => x.id === action.offerId),
    p = m.policy!;
  switch (action.kind) {
    case "discover":
      m.offers = structuredClone(catalog).map((o) => ({
        ...o,
        negotiation: defaultNegotiation(),
      }));
      detail =
        "Three synthetic listings saved. Advertised prices are not purchase totals. The buyer’s ceiling stays private.";
      break;
    case "quote": {
      if (!o) throw new Error("Offer missing");
      const quote = simulatedQuote(o.id);
      o.total = quote.total;
      o.originalTotal = o.total;
      o.optionalAddons = quote.optionalAddons;
      o.quoted = true;
      o.expiresDay = m.day + 7;
      o.evidence = `Simulated written quote: $${o.total.toLocaleString()} all-in, including $${o.optionalAddons.toLocaleString()} optional add-ons; valid through simulated day ${o.expiresDay}.`;
      detail = o.evidence;
      if (o.optionalAddons > 0) m.learning.itemizedFirst = true;
      break;
    }
    case "verify": {
      if (!o) throw new Error("Offer missing");
      o.verified = true;
      o.cleanTitle = o.id !== "park";
      detail = o.cleanTitle
        ? "Synthetic title report is clean. Negotiation can proceed."
        : "Synthetic title report shows a branded title. Walk away, regardless of discount.";
      if (!o.cleanTitle)
        o.negotiation!.stopReason = "Branded title — walk away";
      o.evidence += " " + detail;
      break;
    }
    case "negotiate": {
      if (!o || o.total === undefined || !action.tactic)
        throw new Error("Quote and tactic required");
      const n = o.negotiation!;
      const competitor =
        action.tactic === "competing_offer" ? alternative(m, o) : undefined;
      const reference = competitor
        ? {
            car: competitor.car,
            total: competitor.total!,
            offerId: competitor.id,
          }
        : undefined;
      const anchor =
        Math.floor(
          Math.min(
            p.targetTotal * 0.95,
            o.total * 0.94,
            reference ? reference.total - 300 : Infinity,
          ) / 50,
        ) * 50;
      // Never raise an unanswered counter. Subsequent answered rounds hold or lower it.
      const counterTotal = Math.min(
        anchor,
        n.lastCounter ?? Infinity,
        p.targetTotal,
        m.budget,
      );
      n.rounds++;
      n.lastCounter = counterTotal;
      n.pending = {
        round: n.rounds,
        tactic: action.tactic,
        counterTotal,
        requestedDay: m.day,
        replyDueDay: o.id === "north" && n.rounds === 1 ? null : m.day + 2,
        followUpDueDay: m.day + p.followUpDays,
        followUps: 0,
        message: "",
        ...(reference ? { reference } : {}),
      };
      n.pending.message = buyerMessage(o.car, o.total, n.pending);
      n.lastBuyerMessage = n.pending.message;
      n.stopReason = undefined;
      o.negotiated = false;
      title = `${o.dealer}: firm counter, round ${n.rounds}`;
      detail = n.pending.message;
      Object.assign(extra, { speaker: "buyer", round: n.rounds, counterTotal });
      break;
    }
    case "follow_up": {
      if (!o?.negotiation?.pending) throw new Error("Pending counter required");
      const n = o.negotiation,
        x = n.pending!;
      x.followUps++;
      n.followUps++;
      x.followUpDueDay = m.day + p.followUpDays;
      // Northstar's first reply is withheld until a follow-up: a visible persistence test.
      if (x.replyDueDay === null) x.replyDueDay = m.day + 1;
      n.lastBuyerMessage = followUpMessage(x);
      title = `${o.dealer}: follow-up ${x.followUps}, counter unchanged`;
      detail = n.lastBuyerMessage;
      Object.assign(extra, {
        speaker: "buyer",
        round: x.round,
        counterTotal: x.counterTotal,
      });
      break;
    }
    case "reply": {
      if (!o?.negotiation?.pending || o.total === undefined)
        throw new Error("Pending counter required");
      const n = o.negotiation,
        x = n.pending!;
      const reply = simulatedReply(o.id, o.total, o.optionalAddons ?? 0, x);
      o.total = reply.total;
      o.optionalAddons = reply.optionalAddons;
      o.expiresDay = m.day + 7;
      n.lastDealerMessage = reply.message;
      n.lastReduction = reply.reduction;
      n.stalls = reply.reduction > 0 ? 0 : n.stalls + 1;
      n.pending = undefined;
      m.learning.observations++;
      m.learning.totalReduction += reply.reduction;
      const stats = m.learning.tactics![x.tactic] ?? {
        attempts: 0,
        reduction: 0,
      };
      stats.attempts++;
      stats.reduction += reply.reduction;
      m.learning.tactics![x.tactic] = stats;
      n.stopReason = stopReason(m, o);
      o.negotiated = !!n.stopReason;
      o.evidence = `Latest simulated written total: $${o.total.toLocaleString()}, valid through day ${o.expiresDay}. ${o.cleanTitle ? "Clean title verified." : ""}`;
      title = `${o.dealer}: ${reply.reduction > 0 ? "concession received" : "held its price"}`;
      detail = `${reply.message} ${n.stopReason ? `Stopped: ${n.stopReason}.` : "Target not reached. Continue negotiating."}`;
      Object.assign(extra, {
        speaker: "dealer",
        round: x.round,
        counterTotal: x.counterTotal,
        resultingTotal: o.total,
        reduction: reply.reduction,
      });
      break;
    }
    case "close": {
      if (!o) throw new Error("Offer missing");
      o.negotiation!.pending = undefined;
      o.negotiation!.stopReason = "No substantive reply after follow-up limit";
      o.negotiated = true;
      detail =
        "Stopped pursuing this dealer after the configured follow-up limit. Existing written evidence remains available for review.";
      break;
    }
    case "wait":
      m.day = nextDue(m);
      title = `Simulated day ${m.day}: negotiation resumes`;
      detail =
        "Advanced the demo clock to a saved reply/follow-up deadline. This is simulated elapsed time, not a real day of dealer contact.";
      break;
    case "decide": {
      for (const offer of m.offers) {
        offer.negotiation!.stopReason =
          stopReason(m, offer) ?? "Negotiation complete";
        offer.negotiation!.pending = undefined;
        offer.negotiated = true;
      }
      const best = m.offers
        .filter((o) => eligible(o, m))
        .sort((a, b) => a.total! - b.total!)[0];
      m.selected = best?.id;
      m.status = best ? "approval" : "blocked";
      title = best
        ? best.total! <= p.targetTotal
          ? "Target beaten. Your decision."
          : "Best available offer: target not reached"
        : "Walk away: no offer fits your limits";
      detail = best
        ? `${best.car}: $${best.total!.toLocaleString()} all-in. ${best.total! <= p.targetTotal ? "Negotiation target reached." : `Still $${(best.total! - p.targetTotal).toLocaleString()} above target; no automatic acceptance.`} You decide whether to proceed. No real dealer has been contacted.`
        : "No current verified offer fits your private ceiling and mileage limit. Tony will not raise your limits to manufacture a deal.";
      break;
    }
  }
  return {
    mission: m,
    event: {
      id: `${m.id}:${m.version}`,
      missionId: m.id,
      version: m.version,
      day: m.day,
      at: m.updated,
      kind: action.kind,
      title,
      detail,
      offerId: action.offerId,
      actionKey: `${input.id}:${input.version}:${action.kind}:${action.offerId ?? ""}:${action.tactic ?? ""}`,
      ...extra,
    },
  };
}
export function edit(
  input: Mission,
  command: string,
  budget?: number,
  maxMiles?: number,
  targetTotal?: number,
  maxRounds?: number,
): { mission: Mission; event: Event } {
  const m = normalizeMission(input);
  m.version++;
  m.updated = new Date().toISOString();
  m.nextWakeAt = m.updated;
  let title = "",
    detail = "";
  if (command === "brief") {
    if (
      !Number.isFinite(budget) ||
      budget! < 10000 ||
      budget! > 100000 ||
      !Number.isFinite(maxMiles) ||
      maxMiles! < 1000 ||
      maxMiles! > 200000
    )
      throw new Error(
        "Use a budget between $10,000 and $100,000 and mileage between 1,000 and 200,000.",
      );
    const target = targetTotal ?? Math.min(m.policy!.targetTotal, budget!),
      rounds = maxRounds ?? m.policy!.maxRounds;
    if (
      !Number.isFinite(target) ||
      target < 5000 ||
      target > budget! ||
      !Number.isInteger(rounds) ||
      rounds < 1 ||
      rounds > 6
    )
      throw new Error(
        "Use a negotiation target between $5,000 and your ceiling, and 1–6 rounds.",
      );
    m.budget = Math.round(budget!);
    m.maxMiles = Math.round(maxMiles!);
    m.policy!.targetTotal = Math.round(target);
    m.policy!.maxRounds = rounds;
    m.selected = undefined;
    m.status = "active";
    for (const o of m.offers) {
      const n = o.negotiation!;
      n.pending = undefined;
      n.lastCounter =
        n.lastCounter === undefined
          ? undefined
          : Math.min(n.lastCounter, m.policy!.targetTotal);
      if (n.stopReason !== "No substantive reply after follow-up limit")
        n.stopReason = undefined;
      o.negotiated = !!stopReason(m, o);
    }
    title = "Negotiation brief updated";
    detail = `Private ceiling $${m.budget.toLocaleString()}, target $${target.toLocaleString()}, ${rounds} rounds per dealer, maximum ${m.maxMiles.toLocaleString()} miles. Previous approval and pending simulated counters invalidated. Completed rounds and concessions retained.`;
  } else if (command === "pause") {
    if (m.status !== "active")
      throw new Error("Only an active mission can pause");
    m.status = "paused";
    title = "Mission paused";
    detail =
      "Saved counters, pending replies, follow-up deadlines, and completed rounds. Restarting the worker will not lose them.";
  } else if (command === "resume") {
    if (m.status !== "paused")
      throw new Error("Only a paused mission can resume");
    m.status = "active";
    m.recoveries++;
    title = "Resumed from durable checkpoint";
    detail =
      "Loaded the latest ceiling, target, dealer counters, and reply deadlines. Continue the existing negotiations without resending committed counters.";
  } else if (command === "approve") {
    const chosen = m.offers.find((o) => o.id === m.selected);
    if (m.status !== "approval" || !chosen || !eligible(chosen, m))
      throw new Error(
        "The selected offer is no longer eligible. Re-evaluate it first.",
      );
    m.status = "approved";
    title = "Purchase packet approved";
    detail =
      "You approved the simulated packet. Actual dealer contact, deposits, signatures, and purchase execution are not connected in this prototype.";
  } else throw new Error("Unknown command");
  m.lastDecision = detail;
  return {
    mission: m,
    event: {
      id: `${m.id}:${m.version}`,
      missionId: m.id,
      version: m.version,
      day: m.day,
      at: m.updated,
      kind: command,
      title,
      detail,
    },
  };
}
