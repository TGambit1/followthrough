import assert from "node:assert/strict";
const base = "http://localhost:3100";
let cookie = "";
let version = 0;
async function call(command: string, extra: Record<string, number> = {}) {
  const r = await fetch(`${base}/api/mission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ command, version, ...extra }),
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie")!.split(";")[0];
  const body = await r.json();
  assert.ok(r.ok, JSON.stringify(body));
  version = body.mission.version;
  return body;
}
async function main() {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Your next car/);
  let d = await call("create");
  for (let i = 0; i < 4; i++) d = await call("step");
  d = await call("brief", { budget: 29500, maxMiles: 40000 });
  d = await call("pause");
  const loaded = await (
    await fetch(`${base}/api/mission`, { headers: { Cookie: cookie } })
  ).json();
  assert.equal(loaded.mission.budget, 29500);
  assert.equal(loaded.mission.status, "paused");
  d = await call("resume");
  for (let i = 0; i < 100 && d.mission.status === "active"; i++)
    d = await call("step");
  assert.equal(d.mission.status, "approval");
  assert.equal(d.mission.selected, "river");
  d = await call("approve");
  assert.equal(d.mission.status, "approved");
  console.log(
    "HTTP smoke passed: rendered page → create → quotes → budget update → pause → reload → resume → verified offer → packet approval.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
