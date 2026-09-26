import { createHash, timingSafeEqual } from "node:crypto";
import { validateSpec, createDeal, nextDeal, commandDeal } from "@/lib/deal";
import { readDeal, saveDeal, dealHistory } from "@/lib/deal-store";
import { planDeal } from "@/lib/deal-planner";
export const runtime = "nodejs";
export const maxDuration = 60;
function canonical(v: unknown): unknown {
  return Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => [k, canonical(x)]),
        )
      : v;
}
const digest = (s: string) => createHash("sha256").update(s).digest();
function auth(r: Request) {
  const key = process.env.NEGOTIATION_API_KEY;
  if (!key)
    return Response.json(
      { error: "Negotiation API key not configured" },
      { status: 503 },
    );
  const supplied = r.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(supplied), digest(`Bearer ${key}`)))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}
function idValid(id: unknown): id is string {
  return typeof id === "string" && /^[a-f0-9]{32}$/.test(id);
}
function failure(e: unknown) {
  const message = e instanceof Error ? e.message : "";
  const safe = /^(Invalid |Conflict:|Model )/.test(message);
  return Response.json(
    {
      error: safe
        ? message
        : "Storage request failed; check Atlas access and retry with the same request/version.",
    },
    { status: message.startsWith("Conflict:") ? 409 : safe ? 400 : 503 },
  );
}
export async function GET(request: Request) {
  const denied = auth(request);
  if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!idValid(id)) throw new Error("Invalid negotiation ID");
    const deal = await readDeal(id);
    return deal
      ? Response.json({ deal, events: await dealHistory(id) })
      : Response.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  const denied = auth(request);
  if (denied) return denied;
  try {
    const raw = await request.text();
    if (raw.length > 20000)
      return Response.json({ error: "Request too large" }, { status: 413 });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid request");
    if (body.command === "create") {
      const requestId = request.headers.get("Idempotency-Key");
      if (!requestId || requestId.length < 8 || requestId.length > 128)
        throw new Error("Invalid Idempotency-Key: use 8–128 characters");
      const id = createHash("sha256")
        .update(requestId)
        .digest("hex")
        .slice(0, 32);
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(canonical(body.spec ?? {})))
        .digest("hex");
      const previous = await readDeal(id);
      if (previous) {
        if (previous.requestFingerprint !== fingerprint)
          throw new Error(
            "Conflict: Idempotency-Key was used with a different spec",
          );
        return Response.json({ deal: previous, replayed: true });
      }
      const spec = validateSpec(body.spec ?? {});
      const deal = createDeal(id, spec);
      deal.requestFingerprint = fingerprint;
      await saveDeal(
        deal,
        {
          id: `${id}:0`,
          dealId: id,
          version: 0,
          kind: "created",
          at: deal.createdAt,
          detail:
            "Negotiation created. Counterparty delivery is performed by the caller’s authorized integration.",
        },
        null,
      );
      return Response.json({ deal }, { status: 201 });
    }
    if (!idValid(body.id)) throw new Error("Invalid negotiation ID");
    const before = await readDeal(body.id);
    if (!before) return Response.json({ error: "Not found" }, { status: 404 });
    if (!Number.isInteger(body.version) || body.version !== before.version)
      throw new Error("Conflict: provide the latest version");
    const result =
      body.command === "next"
        ? nextDeal(before, await planDeal(before))
        : commandDeal(before, body);
    if (!result) return Response.json({ deal: before, changed: false });
    await saveDeal(result.deal, result.event, before.version);
    return Response.json({ deal: result.deal, event: result.event });
  } catch (e) {
    return failure(e);
  }
}
