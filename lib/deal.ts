export type DealSpec = {
  subject: string;
  counterparty: string;
  direction: "minimize" | "maximize";
  currency: string;
  target: number;
  limit: number;
  initialOffer: number;
  requiredTerms: string[];
  maxRounds: number;
  followUpHours: number;
  maxFollowUps: number;
  deadline: string;
};
export type Draft = {
  id: string;
  kind: "counter" | "follow_up";
  round: number;
  amount: number;
  tactic: "itemize" | "hold" | "final";
  text: string;
  createdAt: string;
  sentAt?: string;
  deliveryId?: string;
  followUps: number;
  nextFollowUpAt?: string;
};
export type Deal = {
  requestFingerprint?: string;
  id: string;
  version: number;
  spec: DealSpec;
  status:
    | "active"
    | "draft_ready"
    | "awaiting_reply"
    | "needs_approval"
    | "approved"
    | "walked_away"
    | "paused";
  resumeStatus?: Deal["status"];
  rounds: number;
  stalls: number;
  latestOffer: number;
  latestTerms: string[];
  latestSource?: string;
  latestReply?: string;
  pending?: Draft;
  lastCounter?: number;
  lastTactic?: Draft["tactic"];
  tokens: number;
  createdAt: string;
  updatedAt: string;
  stopReason?: string;
  outcomes: Partial<
    Record<Draft["tactic"], { responses: number; improvement: number }>
  >;
};
export type DealEvent = {
  id: string;
  dealId: string;
  version: number;
  kind: string;
  at: string;
  detail: string;
  draft?: Draft;
  amount?: number;
  sourceId?: string;
};
export type DealDecision = {
  tactic: Draft["tactic"];
  rationale: string;
  tokens: number;
};
const text = (v: unknown, name: string, max = 300) => {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw new Error(`Invalid ${name}`);
  return v.trim();
};
const amount = (v: unknown, name: string) => {
  if (
    typeof v !== "number" ||
    !Number.isFinite(v) ||
    v <= 0 ||
    v > 1e9 ||
    Math.abs(v * 100 - Math.round(v * 100)) > 0.0001
  )
    throw new Error(`Invalid ${name}`);
  return v;
};
const integer = (v: unknown, fallback: number, min: number, max: number) => {
  const n = v ?? fallback;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max)
    throw new Error("Invalid negotiation limit");
  return n;
};
export function validateSpec(
  body: Record<string, unknown>,
  now = new Date(),
): DealSpec {
  if (body.direction !== "minimize" && body.direction !== "maximize")
    throw new Error("Invalid direction");
  const target = amount(body.target, "target"),
    limit = amount(body.limit, "private limit");
  if (body.direction === "minimize" ? target > limit : target < limit)
    throw new Error("Invalid target: must be inside the private limit");
  const currency = text(body.currency ?? "USD", "currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency");
  const rawTerms = body.requiredTerms ?? [];
  if (!Array.isArray(rawTerms) || rawTerms.length > 10)
    throw new Error("Invalid required terms");
  const requiredTerms = [
    ...new Set(rawTerms.map((x) => text(x, "required term", 200))),
  ];
  const deadline =
    body.deadline === undefined
      ? new Date(+now + 7 * 86400000).toISOString()
      : text(body.deadline, "deadline", 40);
  if (
    !Number.isFinite(Date.parse(deadline)) ||
    Date.parse(deadline) <= +now ||
    Date.parse(deadline) > +now + 30 * 86400000
  )
    throw new Error("Invalid deadline: choose a future time within 30 days");
  return {
    subject: text(body.subject, "subject"),
    counterparty: text(body.counterparty, "counterparty"),
    direction: body.direction,
    currency,
    target,
    limit,
    initialOffer: amount(body.initialOffer, "initial offer"),
    requiredTerms,
    maxRounds: integer(body.maxRounds, 4, 1, 10),
    followUpHours: integer(body.followUpHours, 24, 1, 168),
    maxFollowUps: integer(body.maxFollowUps, 2, 0, 3),
    deadline: new Date(deadline).toISOString(),
  };
}
export function createDeal(id: string, spec: DealSpec, now = new Date()): Deal {
  return {
    id,
    version: 0,
    spec,
    status: "active",
    rounds: 0,
    stalls: 0,
    latestOffer: spec.initialOffer,
    latestTerms: [],
    tokens: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    outcomes: {},
  };
}
function meets(d: Deal, n: number, threshold: number) {
  return d.spec.direction === "minimize" ? n <= threshold : n >= threshold;
}
export function termsMet(d: Deal) {
  return d.spec.requiredTerms.every((t) => d.latestTerms.includes(t));
}
export function improvement(d: Deal) {
  return (
    (d.spec.initialOffer - d.latestOffer) *
    (d.spec.direction === "minimize" ? 1 : -1)
  );
}
function finish(d: Deal, reason: string) {
  d.pending = undefined;
  d.stopReason = reason;
  d.status =
    d.latestSource && meets(d, d.latestOffer, d.spec.limit) && termsMet(d)
      ? "needs_approval"
      : "walked_away";
}
function fmt(d: Deal, n: number) {
  return `${d.spec.currency} ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
export function nextDeal(
  input: Deal,
  decision: DealDecision,
  now = new Date(),
): { deal: Deal; event: DealEvent } | null {
  const d = structuredClone(input);
  if (
    d.status === "draft_ready" ||
    !["active", "awaiting_reply"].includes(d.status)
  )
    return null;
  let kind = "counter",
    detail = "";
  if (+now >= Date.parse(d.spec.deadline)) {
    finish(d, "Deadline reached");
    d.status = "walked_away";
    kind = "stopped";
    detail = d.stopReason!;
  } else if (d.status === "awaiting_reply") {
    if (
      !d.pending?.sentAt ||
      !d.pending.nextFollowUpAt ||
      +now < Date.parse(d.pending.nextFollowUpAt)
    )
      return null;
    if (d.pending.followUps >= d.spec.maxFollowUps) {
      finish(d, "No substantive reply after follow-up limit");
      kind = "stopped";
      detail = d.stopReason!;
    } else {
      const p = d.pending;
      d.pending = {
        ...p,
        id: `${d.id}:${d.version + 1}`,
        kind: "follow_up",
        createdAt: now.toISOString(),
        sentAt: undefined,
        deliveryId: undefined,
        nextFollowUpAt: undefined,
        followUps: p.followUps + 1,
        text: `Following up on my ${fmt(d, p.amount)} counter for ${d.spec.subject}. The counter has not changed. Please provide a concrete written response with all mandatory charges and terms. Without a substantive response, I will stop pursuing this proposal. No agreement is authorized by this message.`,
      };
      d.status = "draft_ready";
      kind = "follow_up";
      detail = d.pending.text;
    }
  } else if (
    d.latestSource &&
    meets(d, d.latestOffer, d.spec.target) &&
    termsMet(d)
  ) {
    finish(d, "Target and required terms satisfied");
    kind = "stopped";
    detail = d.stopReason!;
  } else if (d.rounds >= d.spec.maxRounds || d.stalls >= 2) {
    finish(
      d,
      d.rounds >= d.spec.maxRounds
        ? "Round limit reached"
        : "Two replies without price improvement",
    );
    kind = "stopped";
    detail = d.stopReason!;
  } else {
    d.rounds++;
    const tactic = d.rounds === d.spec.maxRounds ? "final" : decision.tactic;
    const fraction =
      d.rounds === d.spec.maxRounds ? 1 : d.rounds === 1 ? 0.95 : 0.975;
    const counter =
      Math.round(
        d.spec.target *
          (d.spec.direction === "minimize" ? fraction : 2 - fraction) *
          100,
      ) / 100;
    const clauses = d.spec.requiredTerms.length
      ? `Required terms: ${d.spec.requiredTerms.join("; ")}. `
      : "";
    const opening =
      tactic === "itemize"
        ? "Break out every mandatory charge and optional add-on. "
        : tactic === "final"
          ? "Have the person authorized to approve the terms review this final counter. "
          : "Your current proposal still leaves a gap. ";
    detail = `Regarding ${d.spec.subject}: your current proposal is ${fmt(d, d.latestOffer)}. ${opening}My counter is ${fmt(d, counter)} on the same stated pricing basis. ${clauses}Please send a revised written proposal with all charges and conditions. I am prepared to walk away. This is a negotiation proposal, subject to the buyer or principal’s final review; it is not acceptance or authority to transact.`;
    d.pending = {
      id: `${d.id}:${d.version + 1}`,
      kind: "counter",
      round: d.rounds,
      amount: counter,
      tactic,
      text: detail,
      createdAt: now.toISOString(),
      followUps: 0,
    };
    d.lastCounter = counter;
    d.lastTactic = tactic;
    d.status = "draft_ready";
    d.tokens += decision.tokens;
  }
  d.version++;
  d.updatedAt = now.toISOString();
  return {
    deal: d,
    event: {
      id: `${d.id}:${d.version}`,
      dealId: d.id,
      version: d.version,
      kind,
      at: d.updatedAt,
      detail,
      draft: d.pending,
    },
  };
}
export function commandDeal(
  input: Deal,
  body: Record<string, unknown>,
  now = new Date(),
): { deal: Deal; event: DealEvent } {
  const d = structuredClone(input);
  const command = body.command;
  let detail = "";
  if (command === "mark_sent") {
    if (d.status !== "draft_ready" || body.draftId !== d.pending?.id)
      throw new Error("Conflict: draft is no longer current");
    d.pending!.deliveryId = text(body.deliveryId, "delivery receipt", 200);
    d.pending!.sentAt = now.toISOString();
    d.pending!.nextFollowUpAt = new Date(
      +now + d.spec.followUpHours * 3600000,
    ).toISOString();
    d.status = "awaiting_reply";
    detail =
      "Caller reported delivery of the current draft. Follow-up deadline persisted.";
  } else if (command === "reply") {
    if (d.status !== "awaiting_reply" || body.draftId !== d.pending?.id)
      throw new Error(
        "Conflict: reply must reference the delivered current draft",
      );
    const next = amount(body.amount, "reply amount"),
      source = text(body.sourceId, "reply source", 200),
      reply = text(body.message, "reply message", 4000);
    const supplied = body.acceptedTerms ?? [];
    if (
      !Array.isArray(supplied) ||
      supplied.length > 10 ||
      supplied.some(
        (t) => typeof t !== "string" || !d.spec.requiredTerms.includes(t),
      )
    )
      throw new Error("Invalid accepted terms");
    const delta =
      (d.latestOffer - next) * (d.spec.direction === "minimize" ? 1 : -1);
    const termsImproved = (supplied as string[]).some(
      (t) => !d.latestTerms.includes(t),
    );
    d.stalls = delta > 0 || termsImproved ? 0 : d.stalls + 1;
    const tactic = d.pending!.tactic,
      prior = d.outcomes[tactic] ?? { responses: 0, improvement: 0 };
    prior.responses++;
    prior.improvement += delta;
    d.outcomes[tactic] = prior;
    d.latestOffer = next;
    d.latestTerms = supplied as string[];
    d.latestSource = source;
    d.latestReply = reply;
    d.pending = undefined;
    d.status = "active";
    detail = `Recorded caller-supplied quote ${fmt(d, next)}. Price improvement from prior quote: ${fmt(d, delta)}. Source: ${source}. ${reply}`;
  } else if (command === "revise") {
    if (!body.spec || typeof body.spec !== "object" || Array.isArray(body.spec))
      throw new Error("Invalid revised spec");
    d.spec = validateSpec(
      { ...d.spec, ...body.spec, initialOffer: d.spec.initialOffer },
      now,
    );
    d.pending = undefined;
    d.stopReason = undefined;
    d.resumeStatus = undefined;
    d.status = "active";
    d.latestTerms = d.latestTerms.filter((t) =>
      d.spec.requiredTerms.includes(t),
    );
    detail =
      "Updated target, private limit and terms. Pending drafts and earlier approval invalidated; prior rounds and evidence retained.";
  } else if (command === "pause") {
    if (!["active", "draft_ready", "awaiting_reply"].includes(d.status))
      throw new Error("Conflict: this negotiation cannot pause");
    d.resumeStatus = d.status;
    d.status = "paused";
    detail =
      "Paused with pending draft, counters and follow-up deadline preserved.";
  } else if (command === "resume") {
    if (d.status !== "paused" || !d.resumeStatus)
      throw new Error("Conflict: negotiation is not paused");
    d.status = d.resumeStatus;
    d.resumeStatus = undefined;
    detail = "Resumed from persistent state.";
  } else if (command === "approve") {
    if (
      d.status !== "needs_approval" ||
      !meets(d, d.latestOffer, d.spec.limit) ||
      !termsMet(d) ||
      +now >= Date.parse(d.spec.deadline)
    )
      throw new Error("Conflict: quote is not eligible for approval");
    d.status = "approved";
    detail =
      "Principal approved the packet. No payment, signature or external acceptance was executed.";
  } else if (command === "walk_away") {
    d.status = "walked_away";
    d.pending = undefined;
    d.stopReason = "Principal ended negotiation";
    detail = d.stopReason;
  } else throw new Error("Invalid command");
  d.version++;
  d.updatedAt = now.toISOString();
  return {
    deal: d,
    event: {
      id: `${d.id}:${d.version}`,
      dealId: d.id,
      version: d.version,
      kind: String(command),
      at: d.updatedAt,
      detail,
      amount: command === "reply" ? d.latestOffer : undefined,
      sourceId: command === "reply" ? d.latestSource : undefined,
    },
  };
}
