#!/usr/bin/env tsx
/**
 * Stamp the unified LLM Vitest harness into lean host repos.
 *
 * Materialises:
 *   - evals/vitest.config.ts
 *   - evals/setup.ts
 *   - evals/_zoto/plugin-root.ts
 *   - evals/_llm/sandbox.ts
 *   - evals/_shared/result-yaml-writer.ts
 *   - evals/reporters/zoto-eval-reporter.ts
 *   - evals/llm/_shared/* (JSON loader, run-llm-suite, reporters, …)
 *
 * Idempotent — files are only written when content differs.
 *
 * Invoked by `stamp-lean-layout.ts`, `eval-stamp.ts --baseline-only`, and
 * directly via `pnpm exec tsx .../stamp-unified-llm-harness.ts`.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_ROOT = join(PLUGIN_ROOT, "templates", "llm", "unified-harness");

export interface StampUnifiedLlmHarnessOptions {
  repoRoot: string;
  evalsDir?: string;
  dryRun?: boolean;
}

export interface StampUnifiedLlmHarnessResult {
  evalsDir: string;
  written: string[];
  unchanged: string[];
}

function walkTemplateFiles(
  current: string,
  base: string,
  visit: (absPath: string, relFromBase: string) => void,
): void {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const abs = join(current, entry.name);
    const rel = relative(base, abs).split("\\").join("/");
    if (entry.isDirectory()) {
      walkTemplateFiles(abs, base, visit);
      continue;
    }
    visit(abs, rel);
  }
}

function destRelFromTemplateRel(templateRel: string): string {
  if (templateRel.endsWith(".tmpl")) {
    return templateRel.slice(0, -".tmpl".length);
  }
  return templateRel;
}

function writeIfChanged(
  absDest: string,
  body: string,
  dryRun: boolean,
  written: string[],
  unchanged: string[],
): void {
  const existing = existsSync(absDest) ? readFileSync(absDest, "utf-8") : null;
  if (existing === body) {
    unchanged.push(absDest);
    return;
  }
  if (!dryRun) {
    mkdirSync(dirname(absDest), { recursive: true });
    writeFileSync(absDest, body, "utf-8");
  }
  written.push(absDest);
}

export function stampUnifiedLlmHarness(
  opts: StampUnifiedLlmHarnessOptions,
): StampUnifiedLlmHarnessResult {
  const repoRoot = resolve(opts.repoRoot);
  const evalsDir = opts.evalsDir
    ? join(repoRoot, opts.evalsDir)
    : join(repoRoot, "evals");
  const dryRun = !!opts.dryRun;
  const written: string[] = [];
  const unchanged: string[] = [];

  if (!existsSync(TEMPLATE_ROOT)) {
    throw new Error(`unified LLM harness templates missing at ${TEMPLATE_ROOT}`);
  }

  walkTemplateFiles(TEMPLATE_ROOT, TEMPLATE_ROOT, (absTemplate, templateRel) => {
    const destRel = destRelFromTemplateRel(templateRel);
    const absDest = join(evalsDir, destRel);
    const body = readFileSync(absTemplate, "utf-8");
    writeIfChanged(absDest, body, dryRun, written, unchanged);
  });

  return { evalsDir, written, unchanged };
}

function parseCliArgs(argv: string[]): StampUnifiedLlmHarnessOptions {
  const opts: StampUnifiedLlmHarnessOptions = {
    repoRoot: process.cwd(),
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "--repo-root") {
      const v = argv[++i];
      if (v) opts.repoRoot = resolve(v);
    } else if (a === "--evals-dir") {
      const v = argv[++i];
      if (v) opts.evalsDir = v;
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    }
  }
  return opts;
}

if (process.argv[1]?.endsWith("stamp-unified-llm-harness.ts")) {
  const opts = parseCliArgs(process.argv.slice(2));
  const result = stampUnifiedLlmHarness(opts);
  console.log(JSON.stringify(result, null, 2));
}
