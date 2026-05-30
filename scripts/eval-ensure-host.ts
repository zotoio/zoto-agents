#!/usr/bin/env tsx
/**
 * Idempotent host-repo bootstrapper for `.env.example` + `.gitignore`.
 *
 * Stamped into the host repo by `zoto-create-evals` and surfaced as
 * `pnpm run eval:ensure-host`. Two responsibilities:
 *
 *   1. Stamp `.env.example` at the repo root if missing. Existing
 *      files are NEVER overwritten — operators may have other env
 *      vars in there.
 *   2. Ensure `.gitignore` excludes `.env` (and `.env.*`) so secrets
 *      cannot be committed by accident. Creates `.gitignore` if
 *      missing; appends missing rule lines under a labelled header
 *      otherwise. Existing operator-authored entries are never
 *      touched, so this is safe to re-run.
 *   3. Copy the skipped multi-primitive scenario example to
 *      `evals/scenarios/_example-multi-primitive.test.ts` when missing
 *      (never overwrites an existing file).
 *
 * Standalone by design: the host repo carries the `.env.example`
 * body inline so this script does not need to look up the
 * eval-system plugin install path at runtime.
 *
 * Usage:
 *   pnpm run eval:ensure-host                  # write changes
 *   tsx scripts/eval-ensure-host.ts --dry-run  # preview only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SCENARIO_REL_PATH = "evals/scenarios/_example-multi-primitive.test.ts";
const SCENARIO_TEMPLATE_PATH = resolve(
  SCRIPT_DIR,
  "../plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl",
);

const ENV_EXAMPLE_BODY = `# Eval system — environment variables.
#
# Copy this file to \`.env\` (NEVER commit \`.env\`):
#
#   cp .env.example .env
#
# \`.env\` is loaded automatically by the LLM eval runner via \`dotenv/config\`.
# Anything exported in your shell still wins over \`.env\` (standard dotenv
# precedence: existing process.env > .env file).

# Required for \`pnpm run eval:full\` and \`pnpm run eval:llm\`.
# Generate one in Cursor (Settings → API Keys) or via the cloud dashboard.
CURSOR_API_KEY=

# Optional — overrides \`config.llm.model.id\` for the LLM runner.
# Allowed: composer-2.5 | opus-4.6 | sonnet
# (CLI flag \`--model <id>\` still wins over this.)
# ZOTO_EVAL_MODEL=composer-2.5
`;

const GITIGNORE_HEADER = "# zoto-eval-system: keep local secrets out of git";
const GITIGNORE_LINES: readonly string[] = [
  GITIGNORE_HEADER,
  ".env",
  ".env.*",
  "!.env.example",
];

interface CliOptions {
  repoRoot: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { repoRoot: process.cwd(), dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "--repo-root") {
      const v = argv[++i];
      if (v) opts.repoRoot = resolve(v);
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    }
  }
  return opts;
}

function ensureEnvExample(repoRoot: string, dryRun: boolean): string {
  const path = join(repoRoot, ".env.example");
  if (existsSync(path)) return `skipped-existing ${path}`;
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, ENV_EXAMPLE_BODY, "utf-8");
  }
  return `created ${path}`;
}

function ensureGitignore(repoRoot: string, dryRun: boolean): string {
  const path = join(repoRoot, ".gitignore");
  const exists = existsSync(path);
  const current = exists ? readFileSync(path, "utf-8") : "";
  const lines = current.split(/\r?\n/);
  const has = (line: string): boolean => lines.some((l) => l.trimEnd() === line);
  const altEnvCovers = lines.some((l) => {
    const t = l.trim();
    return t === ".env*" || t === "*.env";
  });
  let missing = GITIGNORE_LINES.filter((line) => {
    if (has(line)) return false;
    if (altEnvCovers && (line === ".env" || line === ".env.*")) return false;
    return true;
  });
  if (missing.length === 1 && missing[0] === GITIGNORE_HEADER && exists) {
    missing = [];
  }
  if (missing.length === 0) return `no-change ${path}`;
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    const needsLeadingNewline = exists && current.length > 0 && !current.endsWith("\n");
    const separator = exists && current.trim().length > 0 ? "\n" : "";
    const block = `${separator}${missing.join("\n")}\n`;
    const prefix = needsLeadingNewline ? "\n" : "";
    writeFileSync(path, current + prefix + block, "utf-8");
  }
  return `${exists ? "appended" : "created"} ${path} (added ${missing.length} line${missing.length === 1 ? "" : "s"})`;
}

function ensureScenarioExample(repoRoot: string, dryRun: boolean): string {
  const path = join(repoRoot, SCENARIO_REL_PATH);
  if (existsSync(path)) return `skipped-existing ${path}`;
  if (!existsSync(SCENARIO_TEMPLATE_PATH)) {
    return `skipped-missing-template ${SCENARIO_TEMPLATE_PATH}`;
  }
  const body = readFileSync(SCENARIO_TEMPLATE_PATH, "utf-8");
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, "utf-8");
  }
  return `created ${path}`;
}

const opts = parseArgs(process.argv.slice(2));
console.log(`eval-ensure-host ${opts.dryRun ? "(dry-run) " : ""}in ${opts.repoRoot}`);
console.log(`  ${ensureEnvExample(opts.repoRoot, opts.dryRun)}`);
console.log(`  ${ensureGitignore(opts.repoRoot, opts.dryRun)}`);
console.log(`  ${ensureScenarioExample(opts.repoRoot, opts.dryRun)}`);
