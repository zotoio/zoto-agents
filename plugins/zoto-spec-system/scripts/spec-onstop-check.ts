#!/usr/bin/env tsx
/**
 * Consistency-check CLI for spec-system live-status pairs and config.
 *
 * Use cases:
 *   - The `zoto-spec-executor` and `zoto-spec-judge` agents call this before
 *     they finalise their workflow to guarantee they have not left
 *     inconsistencies in the subtask `.status.{md,yml}` pair, the spec-root
 *     `status.yml`, or `.zoto/spec-system/config.yml`.
 *   - The Cursor `stop` event hook (`hooks/zoto-onstop-check.mjs`) runs the
 *     same library on every agent stop as a defence-in-depth backstop.
 *
 * Behaviour:
 *   - Walks the configured `specsDir` (or a single `--spec-dir`) for any
 *     directory containing `status/`. Each subtask `.status.yml` is
 *     schema-validated; the paired `.status.md` is reconciled to the yml when
 *     they disagree (yml is authoritative — re-rendered via the existing
 *     round-trip helper).
 *   - Detects two unfixable inconsistencies and surfaces them as critical:
 *       1. `state: completed` with any `checklist[].done === false`
 *       2. `extra.judge.verdict: verified` with any `checklist[].done === false`
 *   - Schema-validates `.zoto/spec-system/config.yml` when present.
 *
 * Exit codes:
 *   0  ok (clean OR auto-fixed; no critical issues)
 *   1  CLI usage error
 *   2  one or more critical issues remain (agents must address before exit)
 *
 * Output: a single JSON line on stdout with `{ checked, fixes, issues, hasCritical }`.
 */
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  checkAllSpecs,
  summarise,
  type CheckResult,
} from "../src/onstop-check.js";

interface Args {
  repoRoot: string;
  writeFixes: boolean;
  specDir?: string;
  verbose: boolean;
  format: "json" | "human";
}

function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1 || i + 1 >= argv.length) return undefined;
  return argv[i + 1];
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function parseArgs(argv: string[]): Args {
  const repoRoot = readFlag(argv, "--repo-root") ?? process.cwd();
  const specDir = readFlag(argv, "--spec-dir");
  const writeFixes = !hasFlag(argv, "--check");
  const verbose = hasFlag(argv, "--verbose");
  const format: "json" | "human" = hasFlag(argv, "--human") ? "human" : "json";
  return {
    repoRoot: resolve(repoRoot),
    specDir: specDir ? resolve(specDir) : undefined,
    writeFixes,
    verbose,
    format,
  };
}

function usage(): string {
  return `Usage: spec-onstop-check [options]

  --repo-root <path>   Repository root (default: cwd)
  --spec-dir <path>    Restrict to a single spec directory (absolute path)
  --check              Dry-run: report only, do not auto-fix anything
  --human              Print a human-readable summary instead of JSON
  --verbose            Include the full result body even on success
  -h, --help           Show this message

Exit codes:
  0  ok or auto-fixed; no critical issues
  1  CLI usage error
  2  critical issues remain
`;
}

function emitJson(result: CheckResult, verbose: boolean): void {
  const payload = verbose
    ? result
    : {
        checked: result.checked,
        fixes: result.fixes.length,
        issues: result.issues.length,
        critical: result.issues.filter((i) => i.severity === "critical").length,
        hasCritical: result.hasCritical,
      };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function emitHuman(result: CheckResult): void {
  const lines: string[] = [];
  lines.push(`spec-onstop-check: ${summarise(result)}`);
  for (const fix of result.fixes) {
    lines.push(`  fix [${fix.kind}] ${fix.path}: ${fix.message}`);
  }
  for (const issue of result.issues) {
    lines.push(
      `  ${issue.severity.toUpperCase()} [${issue.kind}] ${issue.path}: ${issue.message}`,
    );
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

export function runCli(rawArgs: string[]): number {
  if (hasFlag(rawArgs, "-h") || hasFlag(rawArgs, "--help")) {
    process.stdout.write(usage());
    return 0;
  }

  let args: Args;
  try {
    args = parseArgs(rawArgs);
  } catch (e) {
    process.stderr.write(
      `${e instanceof Error ? e.message : String(e)}\n${usage()}`,
    );
    return 1;
  }

  let result: CheckResult;
  try {
    result = checkAllSpecs({
      repoRoot: args.repoRoot,
      specDir: args.specDir,
      writeFixes: args.writeFixes,
    });
  } catch (e) {
    process.stderr.write(
      JSON.stringify({
        error: "checkAllSpecs failed",
        message: e instanceof Error ? e.message : String(e),
      }) + "\n",
    );
    return 2;
  }

  if (args.format === "human") {
    emitHuman(result);
  } else {
    emitJson(result, args.verbose);
  }

  return result.hasCritical ? 2 : 0;
}

function executedAsCliEntry(): boolean {
  const a = process.argv[1];
  if (!a) return false;
  try {
    if (import.meta.url !== pathToFileURL(resolve(a)).href) return false;
    // Guard against bundling: only fire when the running entry's basename
    // identifies this CLI specifically.
    return basename(a).startsWith("spec-onstop-check");
  } catch {
    return false;
  }
}

if (executedAsCliEntry()) {
  process.exitCode = runCli(process.argv.slice(2));
}
