import { db } from "./store";
export async function reserveDemoModelCall() {
  if (process.env.NODE_ENV !== "production") return;
  const raw = Number(process.env.DEMO_MODEL_CALL_LIMIT ?? 300);
  if (!Number.isInteger(raw) || raw < 1)
    throw new Error("Demo model budget is not configured correctly.");
  const id = `demo:${new Date().toISOString().slice(0, 10)}`;
  try {
    await (await db())
      .collection<{ _id: string; count: number }>("usage_limits")
      .updateOne(
        { _id: id, count: { $lt: raw } },
        { $inc: { count: 1 } },
        { upsert: true },
      );
  } catch (e) {
    if ((e as { code?: number }).code === 11000)
      throw new Error(
        "Demo model budget reached for today. Please return tomorrow.",
      );
    throw e;
  }
}
