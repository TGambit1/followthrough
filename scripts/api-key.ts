import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
const file = ".env.local";
const contents = readFileSync(file, "utf8");
if (parseEnv(contents).NEGOTIATION_API_KEY?.trim()) {
  console.log("Existing NEGOTIATION_API_KEY preserved.");
} else {
  const key = randomBytes(32).toString("hex");
  const next = /^NEGOTIATION_API_KEY=.*$/m.test(contents)
    ? contents.replace(
        /^NEGOTIATION_API_KEY=.*$/m,
        `NEGOTIATION_API_KEY=${key}`,
      )
    : contents.trimEnd() + `\nNEGOTIATION_API_KEY=${key}\n`;
  writeFileSync(file, next);
  chmodSync(file, 0o600);
  console.log("Created NEGOTIATION_API_KEY in .env.local. Key not printed.");
}
