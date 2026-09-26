import { prepareNegotiationDrafts } from "../lib/deal-worker";
import { activeMissions } from "../lib/store";
import { MAX_STEPS } from "../lib/engine";
import { runStep } from "../lib/run";
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
console.log(
  "Followthrough worker: synthetic dealer adapter, persistent counters and accelerated reply deadlines. Ctrl+C stops the process; checkpoints survive.",
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
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
main().catch(() => {
  process.exitCode = 1;
});
