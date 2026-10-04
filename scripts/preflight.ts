/**
 * Deploy preflight CLI.
 *
 *   npm run preflight
 *
 * Prints the environment report and exits non-zero when something would break
 * production. Intended for the Heroku release phase or a manual dyno check.
 */
import { runDeployPreflight } from "../src/lib/deploy-preflight";

const ICON = { error: "✗", warn: "!", info: "·" } as const;

async function main() {
  const report = await runDeployPreflight();

  console.log(`\nDeploy preflight${report.dyno ? ` — dyno ${report.dyno}` : ""}\n`);

  const order = { error: 0, warn: 1, info: 2 } as const;
  const findings = [...report.findings].sort(
    (a, b) => order[a.level] - order[b.level],
  );

  for (const f of findings) {
    console.log(`  ${ICON[f.level]} [${f.check}] ${f.message}`);
    if (f.hint) console.log(`      → ${f.hint}`);
  }

  const errors = findings.filter((f) => f.level === "error").length;
  const warns = findings.filter((f) => f.level === "warn").length;
  console.log(
    `\n${report.ok ? "PASS" : "FAIL"} — ${errors} error(s), ${warns} warning(s)\n`,
  );

  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("preflight crashed:", e);
  process.exit(2);
});