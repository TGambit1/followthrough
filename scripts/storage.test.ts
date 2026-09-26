import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { createMission, edit } from "../lib/engine";
import { save, readMission, history } from "../lib/store";
test(
  "file checkpoint survives another process and concurrent writers cannot both commit",
  { skip: !!process.env.MONGODB_URI },
  async () => {
    const id = randomUUID();
    try {
      const initial = createMission(id);
      await save(
        initial,
        {
          id: `${id}:0`,
          missionId: id,
          version: 0,
          day: 0,
          at: initial.created,
          kind: "created",
          title: "test",
          detail: "test",
        },
        null,
      );
      const first = edit(initial, "brief", 29500, 40000),
        second = edit(initial, "brief", 28000, 40000);
      const results = await Promise.allSettled([
        save(first.mission, first.event, 0),
        save(second.mission, second.event, 0),
      ]);
      assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
      const current = await readMission(id);
      assert.equal(current?.version, 1);
      assert.equal((await history(id, 1)).length, 2);
      const child = spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/read-checkpoint.ts", id],
        { encoding: "utf8", env: { ...process.env, MONGODB_URI: "" } },
      );
      assert.equal(child.status, 0, child.stderr);
      const recovered = JSON.parse(child.stdout);
      assert.equal(recovered.version, 1);
      assert.equal(recovered.budget, current?.budget);
    } finally {
      await rm(`.data/${id}`, { recursive: true, force: true });
    }
  },
);
