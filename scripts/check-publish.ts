import { readFileSync, readdirSync } from "node:fs";
import { parseEnv } from "node:util";
import path from "node:path";
const env = parseEnv(readFileSync(".env.local", "utf8"));
const secretNames = [
  "MONGODB_URI",
  "MODEL_API_KEY",
  "NEGOTIATION_API_KEY",
  "CRON_SECRET",
];
const secrets = secretNames
  .map((k) => env[k])
  .filter((s): s is string => !!s && s.length >= 12);
const excluded = new Set(["node_modules", ".git", ".next", ".data", ".vercel"]);
const problems: string[] = [];
let count = 0;
function walk(dir: string) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (
      excluded.has(e.name) ||
      (e.name.startsWith(".env") && e.name !== ".env.example") ||
      e.name.endsWith(".tsbuildinfo")
    )
      continue;
    const filename = path.join(dir, e.name);
    if (e.isDirectory()) walk(filename);
    else if (e.isFile()) {
      const content = readFileSync(filename, "utf8");
      count++;
      if (secrets.some((s) => content.includes(s))) problems.push(filename);
    }
  }
}
walk(".");
if (problems.length) {
  console.error("Credential values found in publishable files:", problems);
  process.exitCode = 1;
} else
  console.log(
    `Checked ${count} source files: no configured credential values found. Exclusions reviewed separately before upload.`,
  );
