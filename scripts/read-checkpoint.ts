import { readMission } from "../lib/store";
readMission(process.argv[2])
  .then((m) => {
    console.log(
      JSON.stringify({
        version: m?.version,
        budget: m?.budget,
        status: m?.status,
      }),
    );
  })
  .catch(() => {
    process.exitCode = 1;
  });
