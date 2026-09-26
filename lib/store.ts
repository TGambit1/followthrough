import { MongoClient } from "mongodb";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { normalizeMission, type Mission, type Event } from "./engine";
const root = path.join(process.cwd(), ".data");
const shared = globalThis as typeof globalThis & {
  followthroughMongo?: Promise<MongoClient>;
};
export const storageMode = () =>
  process.env.MONGODB_URI ? "MongoDB Atlas" : "Local file preview";
export async function client() {
  if (!process.env.MONGODB_URI)
    throw new Error("Atlas connection is not configured");
  // One reused client per process. Default pool settings suit the initial single-user local worker.
  if (!shared.followthroughMongo)
    shared.followthroughMongo = new MongoClient(process.env.MONGODB_URI)
      .connect()
      .catch((e) => {
        shared.followthroughMongo = undefined;
        throw e;
      });
  return shared.followthroughMongo;
}
export async function db() {
  return (await client()).db(process.env.MONGODB_DB || "followthrough");
}
function safeId(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid mission ID");
  return id;
}
function dir(id: string) {
  return path.join(root, safeId(id));
}
export async function readMission(id: string): Promise<Mission | null> {
  if (process.env.MONGODB_URI) {
    const row = await (await db())
      .collection<Mission & { _id: string }>("missions")
      .findOne({ _id: safeId(id) }, { projection: { _id: 0 } });
    return row ? normalizeMission(row) : null;
  }
  try {
    return normalizeMission(
      JSON.parse(await readFile(path.join(dir(id), "mission.json"), "utf8")),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
export async function history(id: string, version: number): Promise<Event[]> {
  if (process.env.MONGODB_URI)
    return (await db())
      .collection<Event>("events")
      .find(
        { missionId: id, version: { $lte: version } },
        { projection: { _id: 0 } },
      )
      .sort({ version: -1 })
      .limit(30)
      .toArray();
  const names = (await readdir(dir(id)))
    .filter((n) => /^event-\d+\.json$/.test(n))
    .map((n) => ({ n, v: Number(n.slice(6, -5)) }))
    .filter((x) => x.v <= version)
    .sort((a, b) => b.v - a.v)
    .slice(0, 30);
  return Promise.all(
    names.map(async (x) =>
      JSON.parse(await readFile(path.join(dir(id), x.n), "utf8")),
    ),
  );
}
export async function save(m: Mission, event: Event, expected: number | null) {
  if (process.env.MONGODB_URI) {
    const c = await client();
    const d = await db();
    const session = c.startSession();
    try {
      await session.withTransaction(async () => {
        const missions = d.collection<Mission & { _id: string }>("missions");
        if (expected === null)
          await missions.insertOne({ ...m, _id: m.id }, { session });
        else {
          const result = await missions.replaceOne(
            { _id: m.id, version: expected },
            m,
            { session },
          );
          if (result.matchedCount !== 1)
            throw new Error("Checkpoint changed. Reload and retry.");
        }
        await d
          .collection<Event & { _id: string }>("events")
          .insertOne({ ...event, _id: event.id }, { session });
      });
    } finally {
      await session.endSession();
    }
    return;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Production requires MONGODB_URI. Local preview is development-only.",
    );
  const folder = dir(m.id);
  await mkdir(folder, { recursive: true });
  const lock = path.join(folder, "lock");
  try {
    await mkdir(lock);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    const age = Date.now() - (await stat(lock)).mtimeMs;
    if (age > 60000) {
      await rm(lock, { recursive: true, force: true });
      throw new Error("Recovered a stale local lock. Retry the action.");
    }
    throw new Error("Checkpoint is busy. Retry shortly.");
  }
  try {
    const prior = await readMission(m.id);
    if (
      (expected === null && prior) ||
      (expected !== null && prior?.version !== expected)
    )
      throw new Error("Checkpoint changed. Reload and retry.");
    await writeFile(
      path.join(folder, `event-${m.version}.json`),
      JSON.stringify(event),
    );
    await writeFile(path.join(folder, "mission.tmp"), JSON.stringify(m));
    await rename(
      path.join(folder, "mission.tmp"),
      path.join(folder, "mission.json"),
    );
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
export async function activeMissions(): Promise<Mission[]> {
  if (process.env.MONGODB_URI)
    return (
      await (
        await db()
      )
        .collection<Mission>("missions")
        .find({ status: "active" }, { projection: { _id: 0 } })
        .limit(20)
        .toArray()
    ).map(normalizeMission);
  await mkdir(root, { recursive: true });
  const ids = (await readdir(root)).filter((x) => /^[a-f0-9-]{36}$/.test(x));
  const rows = await Promise.all(ids.map(readMission));
  return rows.filter((m): m is Mission => !!m && m.status === "active");
}
