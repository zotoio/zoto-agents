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
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";

import { minimatch } from "minimatch";
import { discover, manifestFor } from "./eval-discover.js";
import { loadEvalConfig } from "../src/config-loader.js";
import {
  filterTargetsByDiscoveryIgnores,
  filterTargetsByDiscoveryKinds,
  toolingPhantomEvalCataloguePath,
} from "../engine/discovery-filters.js";
import { readManifestSnapshot } from "../engine/manifest-snapshot.js";
import YAML from "yaml";

const TARGET_GLOB_OPTS = { dot: true } as const;

function loadIgnorePatterns(config: Record<string, unknown>): string[] {
  const raw = config.ignore;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Full-catalog modes pin discovery ignores to `manifest.discovery_config` — never the
 * live `config.yml` — matching enumeration.
 */
function discoveryIgnoreForUpdate(
  manifest: Record<string, unknown>,
  liveConfig: Record<string, unknown>,
  fullCatalog: boolean,
): string[] {
  if (fullCatalog) {
    const dc = manifest.discovery_config;
    return isPlainObject(dc) ? loadIgnorePatterns(dc) : [];
  }
  return loadIgnorePatterns(liveConfig);
}

/** Minimatch against `target.path` (POSIX) or `target.id`, as documented for `/z-eval-update --target`. */
export function targetMatchesUpdateGlob(
  pattern: string,
  targetPath: string,
  targetId: string,
): boolean {
  if (!pattern) return false;
  const posixPath = targetPath.replace(/\\/g, "/");
  return (
    minimatch(posixPath, pattern, TARGET_GLOB_OPTS) ||
    minimatch(targetId, pattern, TARGET_GLOB_OPTS)
  );
}

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
  repoRoot: string = process.cwd(),
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
      /* Only tooling-generated rows count — manifest paths alone (often stale `.eval.json`
       * catalogue leftovers) must not escalate removal drift. */
      const coveredByGenerated = evalFiles.some((f) =>
        evalFileImpliesRemovalIsGeneratedBacked(repoRoot, f),
      );
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

interface ParityCheckResult {
  status: "ok" | "drift" | "error";
  summary?: string;
  detail?: unknown;
}

const ANALYSER_PARITY_SCRIPT_REL = join("scripts", "check-analyser-payload-parity.ts");

function parityHarnessPresent(repoRoot: string): boolean {
  return existsSync(join(repoRoot, ANALYSER_PARITY_SCRIPT_REL));
}

/**
 * When true, `/z-eval-update --check` must not skip the parity gate for a missing
 * harness — CI often forgets setting `CI=true`; common CI vars and an explicit opt-in
 * tighten that without invoking `pnpm` in ephemeral unit-test repos (no parity script present).
 */
function analyserParityGateRequired(): boolean {
  return (
    process.env.ZOTO_EVAL_CHECK_STRICT_ANALYSER_PARITY === "1" ||
    process.env.CI === "true" ||
    process.env.CONTINUOUS_INTEGRATION === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.GITLAB_CI === "true" ||
    process.env.BUILDKITE === "true"
  );
}

function runParityCheck(repoRoot: string): ParityCheckResult {
  if (!parityHarnessPresent(repoRoot)) {
    if (analyserParityGateRequired()) {
      return {
        status: "error",
        summary:
          "scripts/check-analyser-payload-parity.ts missing — required for `/z-eval-update --check` when CI/CD is detected or ZOTO_EVAL_CHECK_STRICT_ANALYSER_PARITY=1",
      };
    }
    return { status: "ok", summary: "skipped-no-parity-harness" };
  }
  try {
    // Fully non-interactive: never attach stdin for CI gate; disallow p/npm prompts.
    const r = spawnSync(
      "pnpm",
      ["exec", "tsx", ANALYSER_PARITY_SCRIPT_REL],
      {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PNPM_NONINTERACTIVE: "1",
          npm_config_yes: "true",
          COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
        },
      },
    );
    const out = (r.stdout ?? "").trim();
    const err = (r.stderr ?? "").trim();
    if (r.status === 0) {
      try {
        return { status: "ok", detail: JSON.parse(out) };
      } catch {
        return { status: "ok", summary: out };
      }
    }
    const summary = [out, err].filter((s) => s.length > 0).join("\n");
    return {
      status: r.status === null ? "error" : "drift",
      summary: summary.length > 0 ? summary : `parity subprocess exited ${r.signal ?? r.status}`,
      detail: err,
    };
  } catch (e) {
    return { status: "error", summary: (e as Error).message };
  }
}

function evalFileImpliesRemovalIsGeneratedBacked(
  repoRoot: string,
  pathRel: string,
): boolean {
  const abs = resolve(repoRoot, pathRel);
  if (!existsSync(abs)) {
    return !toolingPhantomEvalCataloguePath(pathRel);
  }
  try {
    const f = JSON.parse(readFileSync(abs, "utf-8")) as EvalFile;
    return casesOf(f).some((c) => c._meta?.generated === true);
  } catch {
    return false;
  }
}

function loadYaml(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  return YAML.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function writeYaml(path: string, doc: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, YAML.stringify(doc), "utf-8");
}

/** Append-only multi-doc YAML: extend at EOF only — never rewrite earlier documents. */
function appendHistory(path: string, doc: Record<string, unknown>): void {
  const yamlBody = YAML.stringify(doc);
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) {
    appendFileSync(path, `---\n${yamlBody}`, "utf-8");
    return;
  }
  const st = statSync(path);
  let sep: string;
  if (st.size === 0) {
    sep = "---\n";
  } else {
    const fd = openSync(path, "r");
    try {
      const buf = Buffer.alloc(1);
      readSync(fd, buf, 0, 1, st.size - 1);
      sep = buf[0] === 0x0a ? "---\n" : "\n---\n";
    } finally {
      closeSync(fd);
    }
  }
  appendFileSync(path, `${sep}${yamlBody}`, "utf-8");
}

export interface RunOptions {
  repoRoot: string;
  mode: Mode;
  targetedFile?: string;
}

function resolveCheckExitCodeOnDrift(repoRoot: string): number {
  try {
    const { config: typedConfig } = loadEvalConfig(repoRoot);
    const config = typedConfig as unknown as Record<string, unknown>;
    return Number(
      (config.update as Record<string, unknown> | undefined)?.checkExitCodeOnCriticalDrift ?? 2,
    );
  } catch {
    return 2;
  }
}

export function runUpdate(opts: RunOptions): {
  code: number;
  deltas: Delta[];
  summary: Record<string, unknown>;
} {
  /**
   * Parity gate runs before config validation, manifest load, and drift so a broken
   * `config.yml` never hides analyser payload parity failures in `--check`.
   */
  if (opts.mode === "check") {
    const checkParity = runParityCheck(opts.repoRoot);
    if (checkParity.status !== "ok") {
      return {
        code: resolveCheckExitCodeOnDrift(opts.repoRoot),
        deltas: [],
        summary: {
          status: "parity",
          checked: 0,
          critical_count: 0,
          parity_drift: checkParity,
        },
      };
    }
  }

  const { config: typedConfig } = loadEvalConfig(opts.repoRoot);
  const config = typedConfig as unknown as Record<string, unknown>;
  const manifestPath = join(opts.repoRoot, typedConfig.update.manifestPath);
  const historyPath = join(opts.repoRoot, typedConfig.update.historyPath);
  const exitCodeOnDrift = Number(
    (config.update as Record<string, unknown> | undefined)?.checkExitCodeOnCriticalDrift ?? 2,
  );

  const manifest = loadYaml(manifestPath);
  if (!manifest) {
    if (opts.mode === "check") {
      return {
        code: exitCodeOnDrift,
        deltas: [],
        summary: {
          status: "no-manifest",
          checked: 0,
          critical_count: 0,
          parity_drift: null,
        },
      };
    }
    throw new Error(
      `missing ${typedConfig.update.manifestPath} — run /z-eval-create first`,
    );
  }

  const isTargetedScope =
    opts.mode === "targeted-dry" || opts.mode === "targeted-apply";
  const fullCatalog = !isTargetedScope;

  if (fullCatalog) {
    const dc = manifest.discovery_config;
    if (!isPlainObject(dc)) {
      const payload = {
        status: "missing_manifest_discovery_config",
        checked: 0,
        critical_count: 0,
        parity_drift: null,
        note: "Full rediscovery uses manifest.discovery_config only; live eval config is not merged for enumeration.",
      };
      if (opts.mode === "check") {
        return { code: exitCodeOnDrift, deltas: [], summary: payload };
      }
      throw new Error(JSON.stringify(payload));
    }
  }

  const discoveryForEnumerate = (
    fullCatalog
      ? (manifest.discovery_config as Record<string, unknown>)
      : (config as Record<string, unknown>)
  ) as Record<string, unknown>;

  const canon = readManifestSnapshot(opts.repoRoot);
  const ignorePatterns = discoveryIgnoreForUpdate(manifest, config, fullCatalog);

  let manifestBaseline = ((manifest.targets as Array<Record<string, unknown>>) ?? []).slice();
  manifestBaseline = filterTargetsByDiscoveryIgnores(manifestBaseline, ignorePatterns);
  manifestBaseline = filterTargetsByDiscoveryKinds(
    manifestBaseline,
    canon.discoveryTargets,
  );

  const manifestForDelta = { ...manifest, targets: manifestBaseline };
  const current = filterTargetsByDiscoveryIgnores(
    discover(opts.repoRoot, discoveryForEnumerate),
    ignorePatterns,
  );
  let deltas = computeDeltas(manifestForDelta, current, config, opts.repoRoot);

  if (opts.mode === "targeted-dry" || opts.mode === "targeted-apply") {
    const glob = opts.targetedFile ?? "";
    deltas = deltas.filter((d) => targetMatchesUpdateGlob(glob, d.path, d.target_id));
  }

  const critical = deltas.filter((d) => d.critical);

  if (opts.mode === "check") {
    const driftBad = critical.length > 0;
    const summary = {
      status: driftBad ? "drift" : "clean",
      checked: current.length,
      critical_count: critical.length,
      parity_drift: null,
    };
    const code = driftBad ? exitCodeOnDrift : 0;
    return { code, deltas, summary };
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
  if (check) return { mode: "check" };

  const tgtIdx = argv.indexOf("--target");
  let fromFlag: string | undefined;
  if (tgtIdx !== -1 && tgtIdx + 1 < argv.length) {
    const next = argv[tgtIdx + 1];
    if (next && !next.startsWith("--")) fromFlag = next;
  }
  const positional = argv.filter((a) => !a.startsWith("--"));
  const targetedFile = fromFlag ?? positional[0];

  if (targetedFile !== undefined && targetedFile !== "") {
    return { mode: apply ? "targeted-apply" : "targeted-dry", targetedFile };
  }
  return { mode: apply ? "rediscovery-apply" : "rediscovery-dry" };
}

if (process.argv[1] && process.argv[1].endsWith("eval-update.ts")) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const out = runUpdate({ repoRoot: process.cwd(), ...args });
    console.log(JSON.stringify(out.summary));
    if (out.summary.parity_drift != null) {
      console.error(JSON.stringify(out.summary.parity_drift));
    }
    for (const d of out.deltas) {
      if (d.critical) console.error(JSON.stringify(d));
    }
    process.exit(out.code);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
