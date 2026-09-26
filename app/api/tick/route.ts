import { createHash, timingSafeEqual } from "node:crypto";
import { prepareNegotiationDrafts } from "@/lib/deal-worker";
export const runtime = "nodejs";
export const maxDuration = 60;
const hash = (value: string) => createHash("sha256").update(value).digest();
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    !timingSafeEqual(
      hash(request.headers.get("authorization") ?? ""),
      hash(`Bearer ${secret}`),
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await prepareNegotiationDrafts(1);
    return Response.json(
      {
        ok: result.failed === 0,
        ...result,
        delivery: "Drafts only; your integration delivers authorized messages.",
      },
      { status: result.failed ? 503 : 200 },
    );
  } catch {
    return Response.json(
      { error: "Scheduled negotiation step failed; checkpoint preserved." },
      { status: 503 },
    );
  }
}
