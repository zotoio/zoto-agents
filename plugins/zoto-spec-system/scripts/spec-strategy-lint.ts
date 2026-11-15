#!/usr/bin/env tsx
/**
 * Validates and lints the `## Execution Strategy` block of one spec directory.
 * Prints JSON `{ strategy, declared, findings }` and exits 1 when any HIGH finding exists.
 *
 * Usage: spec-strategy-lint --spec-dir specs/<yyyymmdd>-<feature> [--parallel-limit 4]
 */
import { checkSpecExecutionStrategy } from "../src/execution-strategy.js";

function main(): void {
  const argv = process.argv.slice(2);
  let specDir: string | undefined;
  let parallelLimit: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--spec-dir") specDir = argv[++i];
    else if (argv[i] === "--parallel-limit") parallelLimit = Number(argv[++i]);
  }
  if (!specDir) {
    console.error(JSON.stringify({ error: "Missing --spec-dir", code: "INVALID_ARGS" }));
    process.exit(2);
  }
  const result = checkSpecExecutionStrategy(specDir, { parallelLimit: Number.isFinite(parallelLimit) ? parallelLimit : undefined });
  console.log(JSON.stringify({ strategy: result.strategy, declared: result.declared, findings: result.findings }, null, 2));
  process.exit(result.findings.some((f) => f.severity === "HIGH") ? 1 : 0);
}

main();
