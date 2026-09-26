import { prepareNegotiationDrafts } from "../lib/deal-worker";
import { activeMissions } from "../lib/store";
import { MAX_STEPS } from "../lib/engine";
import { runStep } from "../lib/run";
let stopping = false;
function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`\nWorker stopped (${signal}). Checkpoints remain in the database.`);
  process.exit(0);
}
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
console.log(
  "Tony worker: synthetic dealer adapter, persistent counters and accelerated reply deadlines. Ctrl+C stops the process; checkpoints survive.",
);
async function main() {
  while (!stopping) {
    try {
      for (const m of await activeMissions()) {
        if (stopping) break;
        if (
          m.steps >= MAX_STEPS ||
          Date.now() < Date.parse(m.nextWakeAt ?? m.updated)
        )
          continue;
        try {
          const next = await runStep(m);
          console.log(
            `Mission ${m.id.slice(0, 8)} committed v${next.version}: ${next.status}`,
          );
        } catch (e) {
          console.error(e instanceof Error ? e.message : "Worker step failed");
        }
      }
      if (!stopping) await prepareNegotiationDrafts();
    } catch {
      console.error("Storage unavailable; will retry.");
    }
    await sleep(5000);
  }
}
function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      process.off("SIGINT", finish);
      process.off("SIGTERM", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    process.on("SIGINT", finish);
    process.on("SIGTERM", finish);
  });
}
main().catch(() => {
  process.exitCode = 1;
});
