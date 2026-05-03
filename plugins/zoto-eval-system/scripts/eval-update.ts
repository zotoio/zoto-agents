#!/usr/bin/env tsx
/**
 * Plugin-level eval-update entry point. Mirrors templates/llm/agent-sdk/update.ts.tmpl.
 *
 * CORE CONTRACT — ENFORCED AT RUNTIME AND AT COMPILE TIME:
 *
 *   A case is ONLY modified when `case._meta?.generated === true`.
 *
 * User-authored cases (no `_meta`, or `_meta.generated === false`) are
 * never touched. This script throws if asked to violate the contract.
 *
 * The plugin validator greps this file for the guard expression
 * `_meta?.generated === true` — keep it intact.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";

import { discover, manifestFor } from "./eval-discover.js";

export type Mode =
  | "rediscovery-dry"
  | "rediscovery-apply"
  | "targeted-dry"
  | "targeted-apply"
  | "check";

export interface Delta {
  target_id: string;
  path: string;
  kind: "added" | "removed" | "modified" | "unchanged";
  critical: boolean;
  reason: string;
}

export interface EvalCase {
  id: number | string;
  prompt: string;
  assertions: string[];
  _meta?: {
    generated: boolean;
    source_hash?: string | null;
    last_updated?: string | null;
    generated_by?: string | null;
  };
  [k: string]: unknown;
}

export interface EvalFile {
  skill_name?: string;
  evals?: EvalCase[];
  cases?: EvalCase[];
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function normaliseContent(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
}

export function casesOf(file: EvalFile): EvalCase[] {
  return file.evals ?? file.cases ?? [];
}

export function applyCaseUpdates(
  evalFile: EvalFile,
  updates: Array<{ id: number | string; newCase: EvalCase }>,
): EvalFile {
  const cases = casesOf(evalFile);
  for (const { id, newCase } of updates) {
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) {
      cases.push(newCase);
      continue;
    }
    const existing = cases[idx];
    if (!(existing._meta?.generated === true)) {
      throw new Error(
        `refuse-to-mutate: case ${id} is user-authored (no _meta.generated === true); cannot be modified by zoto-update-evals`,
      );
    }
    cases[idx] = newCase;
  }
  const key: "evals" | "cases" = evalFile.evals ? "evals" : "cases";
  (evalFile as Record<string, unknown>)[key] = cases;
  return evalFile;
}

export function classifyDelta(
  config: Record<string, unknown>,
  d: Omit<Delta, "critical" | "reason">,
  oldT: Record<string, unknown> | undefined,
  newT: Record<string, unknown> | undefined,
  coveredByGenerated: boolean,
): Delta {
  const rules = ((config.update ?? {}) as Record<string, unknown>)
    .criticalChangeRules as Record<string, boolean> | undefined;
  const on = (k: string): boolean => (rules ? rules[k] !== false : true);

  if (d.kind === "added" && on("addedTargetWithoutCoverage")) {
    return { ...d, critical: true, reason: "added target with no eval coverage" };
  }
  if (d.kind === "removed" && coveredByGenerated && on("removedTargetWithActiveCases")) {
    return { ...d, critical: true, reason: "removed target with active generated cases" };
  }
  if (d.kind === "modified") {
    const oldFM = ((oldT?.public_surface ?? {}) as Record<string, unknown>).frontmatter as
      | Record<string, string>
      | undefined;
    const newFM = ((newT?.public_surface ?? {}) as Record<string, unknown>).frontmatter as
      | Record<string, string>
      | undefined;
    if (
      oldFM &&
      newFM &&
      (oldFM.name !== newFM.name || oldFM.description !== newFM.description) &&
      on("skillFrontmatterChange")
    ) {
      return { ...d, critical: true, reason: "skill frontmatter name/description changed" };
    }
    if (on("publicSurfaceChange")) {
      return { ...d, critical: true, reason: "public-surface change on covered target" };
    }
  }
  return { ...d, critical: false, reason: "non-critical change" };
}

export function computeDeltas(
  manifest: Record<string, unknown>,
  current: Array<Record<string, unknown>>,
  config: Record<string, unknown>,
): Delta[] {
  const oldTs = ((manifest.targets as Array<Record<string, unknown>>) ?? []).reduce<
    Record<string, Record<string, unknown>>
  >((acc, t) => {
    acc[String(t.id)] = t;
    return acc;
  }, {});
  const newTs = current.reduce<Record<string, Record<string, unknown>>>((acc, t) => {
    acc[String(t.id)] = t;
    return acc;
  }, {});
  const deltas: Delta[] = [];

  for (const id of new Set([...Object.keys(oldTs), ...Object.keys(newTs)])) {
    const oldT = oldTs[id];
    const newT = newTs[id];
    if (!oldT && newT) {
      deltas.push(
        classifyDelta(
          config,
          { target_id: id, path: String(newT.path), kind: "added" },
          oldT,
          newT,
          false,
        ),
      );
    } else if (oldT && !newT) {
      const evalFiles = (oldT.eval_files as string[]) ?? [];
      // We trust the manifest's record of coverage: if the manifest said this
      // target had evals at the last snapshot, removing the target is always a
      // critical change — the user should confirm whether the cases were
      // intentionally orphaned or whether the delete was wrong.
      const coveredByGenerated =
        evalFiles.length > 0 || evalFiles.some((f) => evalFileHasGenerated(f));
      deltas.push(
        classifyDelta(
          config,
          { target_id: id, path: String(oldT.path), kind: "removed" },
          oldT,
          newT,
          coveredByGenerated,
        ),
      );
    } else if (oldT && newT) {
      if (String(oldT.content_hash) !== String(newT.content_hash)) {
        deltas.push(
          classifyDelta(
            config,
            { target_id: id, path: String(newT.path), kind: "modified" },
            oldT,
            newT,
            false,
          ),
        );
      } else {
        deltas.push({
          target_id: id,
          path: String(newT.path),
          kind: "unchanged",
          critical: false,
          reason: "no content change",
        });
      }
    }
  }
  return deltas;
}

function evalFileHasGenerated(path: string): boolean {
  const abs = resolve(process.cwd(), path);
  if (!existsSync(abs)) return false;
  try {
    const f = JSON.parse(readFileSync(abs, "utf-8")) as EvalFile;
    return casesOf(f).some((c) => c._meta?.generated === true);
  } catch {
    return false;
  }
}

function loadYaml(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  const yaml = require("yaml") as typeof import("yaml");
  return yaml.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function writeYaml(path: string, doc: Record<string, unknown>): void {
  const yaml = require("yaml") as typeof import("yaml");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.stringify(doc), "utf-8");
}

function appendHistory(path: string, doc: Record<string, unknown>): void {
  const yaml = require("yaml") as typeof import("yaml");
  mkdirSync(dirname(path), { recursive: true });
  const chunk = "---\n" + yaml.stringify(doc);
  if (!existsSync(path)) {
    writeFileSync(path, chunk, "utf-8");
  } else {
    appendFileSync(path, chunk, "utf-8");
  }
}

export interface RunOptions {
  repoRoot: string;
  mode: Mode;
  targetedFile?: string;
}

export function runUpdate(opts: RunOptions): {
  code: number;
  deltas: Delta[];
  summary: Record<string, unknown>;
} {
  const configPath = join(opts.repoRoot, ".zoto-eval-system", "config.json");
  const manifestPath = join(opts.repoRoot, ".zoto-eval-system", "manifest.yml");
  const historyPath = join(opts.repoRoot, ".zoto-eval-system", "manifest.history.yml");

  if (!existsSync(configPath)) {
    throw new Error("missing .zoto-eval-system/config.json — run /zoto-eval-configure first");
  }
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const manifest = loadYaml(manifestPath);
  if (!manifest) {
    throw new Error("missing .zoto-eval-system/manifest.yml — run /zoto-eval-create first");
  }

  const discoveryConfig = (manifest.discovery_config ?? config) as Record<string, unknown>;
  const current = discover(opts.repoRoot, discoveryConfig);
  let deltas = computeDeltas(manifest, current, config);

  if (opts.mode === "targeted-dry" || opts.mode === "targeted-apply") {
    const glob = opts.targetedFile ?? "";
    deltas = deltas.filter((d) => d.path.includes(glob));
  }

  const critical = deltas.filter((d) => d.critical);

  if (opts.mode === "check") {
    const exitCode = Number(
      (config.update as Record<string, unknown> | undefined)?.checkExitCodeOnCriticalDrift ?? 2,
    );
    const summary = {
      status: critical.length === 0 ? "clean" : "critical",
      checked: current.length,
      critical_count: critical.length,
    };
    return { code: critical.length === 0 ? 0 : exitCode, deltas, summary };
  }

  if (opts.mode === "rediscovery-dry" || opts.mode === "targeted-dry") {
    return { code: 0, deltas, summary: { dry_run: true, critical: critical.length } };
  }

  const newManifest = {
    schema_version: 1,
    created_at: manifest.created_at,
    updated_at: new Date().toISOString(),
    git_ref: headSha(opts.repoRoot),
    generated_by: "zoto-update-evals" as const,
    discovery_config: manifest.discovery_config,
    targets: current,
  };
  writeYaml(manifestPath, newManifest);
  appendHistory(historyPath, newManifest);

  const summary = {
    applied: critical.length,
    added: deltas.filter((d) => d.kind === "added").length,
    removed: deltas.filter((d) => d.kind === "removed").length,
    modified: deltas.filter((d) => d.kind === "modified").length,
  };
  return { code: 0, deltas, summary };
}

function headSha(repoRoot: string): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot }).toString().trim();
  } catch {
    return "0000000000000000000000000000000000000000";
  }
}

function parseArgs(argv: string[]): { mode: Mode; targetedFile?: string } {
  const apply = argv.includes("--apply");
  const check = argv.includes("--check");
  const positional = argv.filter((a) => !a.startsWith("--"));
  if (check) return { mode: "check" };
  if (positional.length > 0) {
    return {
      mode: apply ? "targeted-apply" : "targeted-dry",
      targetedFile: positional[0],
    };
  }
  return { mode: apply ? "rediscovery-apply" : "rediscovery-dry" };
}

if (process.argv[1] && process.argv[1].endsWith("eval-update.ts")) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const out = runUpdate({ repoRoot: process.cwd(), ...args });
    console.log(JSON.stringify(out.summary));
    for (const d of out.deltas) {
      if (d.critical) console.error(JSON.stringify(d));
    }
    process.exit(out.code);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
