import { db, client } from "./store";
import type { Deal, DealEvent } from "./deal";
export async function readDeal(id: string) {
  return (await db())
    .collection<Deal & { _id: string }>("negotiation_sessions")
    .findOne({ _id: id }, { projection: { _id: 0 } });
}
export async function dealHistory(id: string) {
  return (await db())
    .collection<DealEvent>("negotiation_events")
    .find({ dealId: id }, { projection: { _id: 0 } })
    .sort({ version: -1 })
    .limit(30)
    .toArray();
}
export async function saveDeal(d: Deal, e: DealEvent, expected: number | null) {
  const c = await client(),
    database = await db(),
    session = c.startSession();
  try {
    await session.withTransaction(async () => {
      const collection = database.collection<Deal & { _id: string }>(
        "negotiation_sessions",
      );
      if (expected === null)
        await collection.insertOne({ ...d, _id: d.id }, { session });
      else {
        const result = await collection.replaceOne(
          { _id: d.id, version: expected },
          d,
          { session },
        );
        if (result.matchedCount !== 1)
          throw new Error("Conflict: checkpoint changed");
      }
      await database
        .collection<DealEvent & { _id: string }>("negotiation_events")
        .insertOne({ ...e, _id: e.id }, { session });
    });
  } finally {
    await session.endSession();
  }
}
