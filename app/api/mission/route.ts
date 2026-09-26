import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createMission, edit, actions, eligible } from "@/lib/engine";
import { readMission, save, history, storageMode } from "@/lib/store";
import { plannerMode } from "@/lib/planner";
import { runStep } from "@/lib/run";
export const runtime = "nodejs";
export const maxDuration = 60;
async function payload(id?: string) {
  const mission = id ? await readMission(id) : null;
  return {
    mission,
    events: mission ? await history(mission.id, mission.version) : [],
    storage: storageMode(),
    planner: plannerMode(),
    actions: mission ? actions(mission) : [],
    qualified: mission
      ? mission.offers.filter((o) => eligible(o, mission)).length
      : 0,
  };
}
export async function GET() {
  try {
    return Response.json(
      await payload((await cookies()).get("followthrough")?.value),
    );
  } catch {
    return Response.json(
      {
        error:
          "Unable to load the checkpoint. Check database connectivity and server configuration.",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return Response.json({ error: "Origin not allowed" }, { status: 403 });
    const body = await request.json();
    const jar = await cookies();
    let id = jar.get("followthrough")?.value;
    if (body.command === "create") {
      id = randomUUID();
      const m = createMission(id);
      await save(
        m,
        {
          id: `${id}:0`,
          missionId: id,
          version: 0,
          day: 0,
          at: m.created,
          kind: "created",
          title: "Purchase mission created",
          detail:
            "Buy a clean-title car under $32,000 all-in with fewer than 40,000 miles. All listings and dealer responses in this demo are synthetic.",
        },
        null,
      );
      jar.set("followthrough", id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 604800,
      });
    } else {
      if (!id)
        return Response.json(
          { error: "Create a mission first" },
          { status: 400 },
        );
      const m = await readMission(id);
      if (!m)
        return Response.json({ error: "Mission not found" }, { status: 404 });
      if (body.version !== m.version)
        return Response.json(
          {
            error: "Checkpoint changed. Refresh before taking another action.",
          },
          { status: 409 },
        );
      if (body.command === "step") await runStep(m);
      else {
        const result = edit(
          m,
          body.command,
          body.budget,
          body.maxMiles,
          body.targetTotal,
          body.maxRounds,
        );
        await save(result.mission, result.event, m.version);
      }
    }
    return Response.json(await payload(id));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Action failed";
    const allowed =
      /^(Use a budget|Use a negotiation|Only |The selected|Unknown command|That action|This mission|Mission reached|Demo model budget|Checkpoint |Model |Recovered a stale)/.test(
        message,
      );
    return Response.json(
      {
        error: allowed
          ? message
          : "Could not persist this action. Check Atlas access and your configuration; the UI has not marked it complete.",
      },
      { status: 400 },
    );
  }
}
