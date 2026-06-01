#!/usr/bin/env tsx
/**
 * Eval cleanup engine — subtask 03 of eval-system-v2.
 *
 * Diffs the **active** eval-system config (`.zoto/eval-system/config.yml`)
 * against the most recent **manifest snapshot** (`discovery_config.static`)
 * and enumerates every file that should be deleted as part of a framework
 * switch or a removed-target change. The script is invoked by
 * `/z-eval-configure` (subtask 02) — never by the skill or agent directly.
 *
 * --------------------------------------------------------------------------
 * STDOUT CONTRACT
 * --------------------------------------------------------------------------
 * `--dry-run` prints a JSON document that **must validate byte-for-byte**
 * against `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json`
 * (subtask 02 owns the schema). The configurer command renders the same JSON
 * during its `askQuestion` confirmation, so any drift here will break the
 * downstream UI.
 *
 *   {
 *     "schema_version": 1,
 *     "generated_at": "<ISO-8601>",
 *     "generated_by": "eval-cleanup-stale",
 *     "old_snapshot": { "static": { "framework": "..." }, "source": "..." },
 *     "new_snapshot": { ... },
 *     "groups": [
 *       { "reason": "framework-switch" | "removed-target",
 *         "from": "<old>", "to": "<new>", "summary": "...", "files": [...] }
 *     ],
 *     "totals": { "files": <int>, "groups": <int> },
 *     "warnings": ["..."]
 *   }
 *
 * --------------------------------------------------------------------------
 * SESSION-TOKEN MECHANISM
 * --------------------------------------------------------------------------
 * `--dry-run` writes a lockfile at `evals/_runs/.cleanup-token-<runId>.json`
 * containing `{ runId, generated_at, plan_hash, ttl }` (1-hour TTL). `--apply`
 * REQUIRES `--session <runId>` (or `--token <plan_hash>`) and verifies:
 *   1. lockfile exists,
 *   2. `now - generated_at <= ttl`,
 *   3. the live filesystem still produces the same `plan_hash` (no drift).
 * Mismatch ⇒ refuse with a clear error. `--force` skips the gate (logs warning).
 *
 * --------------------------------------------------------------------------
 * USER-CASE PRESERVATION
 * --------------------------------------------------------------------------
 * - `evals.json`: walk each case; skip `_meta.generated === false`. Mixed
 *   files surface in the `warnings` array as `"manual_merge_required: <path>"`
 *   and the file itself is included only with `kind: "llm-case"` and
 *   `preserve_user_authored: true` so the engine performs surgical row-level
 *   deletion on apply (never wholesale-deletes a mixed file).
 * - `*.test.ts` / `*.test.py`: file-level header check via the shared helper
 *   `evals/_llm/_user-case-guards.ts#isGeneratedFile`. No header ⇒ preserve.
 *
 * --------------------------------------------------------------------------
 * ALLOWED PATHS (refusing-path guard)
 * --------------------------------------------------------------------------
 *   - `evals/`
 *   - `plugins/<name>/evals/`
 *   - `.cursor/evals/`
 *   - `.cursor/skills/<name>/evals/`, `skills/<name>/evals/`,
 *     `plugins/<plugin>/skills/<name>/evals/`
 *   - `plugins/zoto-eval-system/templates/additional/bats/`  (bats orphan carve-out)
 *
 * Anything else is refused: non-zero exit, no deletions performed.
 *
 * Usage:
 *   tsx scripts/eval-cleanup-stale.ts --dry-run
 *   tsx scripts/eval-cleanup-stale.ts --dry-run --from pytest --to vitest
 *   tsx scripts/eval-cleanup-stale.ts --apply --session <runId>
 *   tsx scripts/eval-cleanup-stale.ts --apply --force        # CI override
 *   tsx scripts/eval-cleanup-stale.ts --check                # exit 2 on drift
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";
import Ajv from "ajv";

import { isGeneratedFile } from "../engine/_user-case-guards.ts";
import {
  loadIgnoreGlobs,
  matchIgnoreGlob,
  repoRelPosix,
} from "./eval-analyse.ts";
import { loadEvalConfig } from "../src/config-loader.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StaticFramework = "pytest" | "vitest" | "jest";

export interface Snapshot {
  static?: { framework?: StaticFramework };
  source: "manifest" | "filesystem" | "config" | "missing";
}

export type GroupReason = "framework-switch" | "removed-target";

export type FileKind =
  | "framework-fingerprint"
  | "static-test"
  | "llm-case"
  | "eval-json"
  | "directory"
  | "config-snippet";

export interface PlanFile {
  path: string;
  kind: FileKind;
  reason?: string;
  target_id?: string;
  preserve_user_authored?: boolean;
}

export interface PlanGroup {
  reason: GroupReason;
  from?: string;
  to?: string;
  summary?: string;
  files: PlanFile[];
}

export interface CleanupPlan {
  schema_version: 1;
  generated_at: string;
  generated_by: "eval-cleanup-stale";
  old_snapshot: Snapshot;
  new_snapshot: Snapshot;
  groups: PlanGroup[];
  totals: { files: number; groups?: number };
  warnings?: string[];
}

export interface CliArgs {
  from?: string;
  to?: string;
  dryRun: boolean;
  apply: boolean;
  force: boolean;
  manifestHistory: string;
  session?: string;
  token?: string;
  check: boolean;
  help: boolean;
  /** When true, suppress the dry-run lockfile write (used by tests/CI). */
  noLockfile: boolean;
}

interface ComputeOptions {
  fromOverride?: string;
  toOverride?: string;
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const DEFAULT_HISTORY = ".zoto/eval-system/manifest.history.yml";

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    apply: false,
    force: false,
    manifestHistory: DEFAULT_HISTORY,
    check: false,
    help: false,
    noLockfile: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    switch (a) {
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--apply":
        args.apply = true;
        break;
      case "--force":
        args.force = true;
        break;
      case "--check":
        args.check = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--no-lockfile":
        args.noLockfile = true;
        break;
      case "--from":
        args.from = argv[++i];
        break;
      case "--to":
        args.to = argv[++i];
        break;
      case "--manifest-history":
        args.manifestHistory = argv[++i] ?? DEFAULT_HISTORY;
        break;
      case "--session":
        args.session = argv[++i];
        break;
      case "--token":
        args.token = argv[++i];
        break;
      case "--":
        break;
      default:
        if (a.startsWith("--")) {
          // unknown long flag — ignore but warn
          process.stderr.write(`warning: unknown flag '${a}' ignored\n`);
        }
    }
  }
  return args;
}

const HELP_TEXT = `\
Usage: tsx scripts/eval-cleanup-stale.ts [options]

Modes:
  (default)               Same as --dry-run (used by pnpm run eval:cleanup-stale).
  --dry-run               Compute the cleanup plan, write a session-token
                          lockfile, and emit the plan as JSON on stdout.
  --apply                 Execute the deletions enumerated by an earlier
                          --dry-run. Requires --session <runId> or
                          --token <plan_hash>, unless --force is given.
  --check                 Exit 0 when the live filesystem matches the new
                          config (no stale files), exit 2 otherwise.

Diff overrides:
  --from <framework>     Override the OLD static framework value.
  --to <framework>       Override the NEW static framework value.

Apply gating:
  --session <runId>      Pair with --apply: must match a recent --dry-run
                         lockfile (1-hour TTL) and the recorded plan_hash
                         must still match the live filesystem.
  --token <plan_hash>    Alternative to --session: match by hash directly.
  --force                Skip the session gate. Intended for non-interactive
                         CI / migration paths only. Logs a loud warning.

Other:
  --manifest-history <path>   Defaults to ${DEFAULT_HISTORY}
  --no-lockfile               Suppress lockfile write during --dry-run
                              (used by tests/CI).

Stdout contract:
  --dry-run output validates against
  plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json.
`;

// ---------------------------------------------------------------------------
// Snapshot detection
// ---------------------------------------------------------------------------

const STATIC_FRAMEWORKS: ReadonlySet<StaticFramework> = new Set([
  "pytest",
  "vitest",
  "jest",
]);

function asStaticFramework(s: unknown): StaticFramework | undefined {
  return typeof s === "string" && STATIC_FRAMEWORKS.has(s as StaticFramework)
    ? (s as StaticFramework)
    : undefined;
}

export function detectFromFilesystem(repoRoot: string): Snapshot {
  const snap: Snapshot = { source: "filesystem" };
  // Static framework fingerprints
  if (existsSync(join(repoRoot, "evals", "conftest.py"))) {
    snap.static = { framework: "pytest" };
  } else if (existsSync(join(repoRoot, "vitest.config.ts"))) {
    snap.static = { framework: "vitest" };
  } else if (
    existsSync(join(repoRoot, "jest.config.js")) ||
    existsSync(join(repoRoot, "jest.config.ts"))
  ) {
    snap.static = { framework: "jest" };
  }
  return snap;
}

export function readManifestSnapshot(repoRoot: string): Snapshot {
  const path = join(repoRoot, ".zoto", "eval-system", "manifest.yml");
  if (!existsSync(path)) return { source: "missing" };
  let doc: unknown;
  try {
    doc = YAML.parse(readFileSync(path, "utf-8"));
  } catch {
    return { source: "missing" };
  }
  if (!doc || typeof doc !== "object") return { source: "missing" };
  const cfg = (doc as { discovery_config?: unknown }).discovery_config;
  if (!cfg || typeof cfg !== "object") return { source: "missing" };
  const c = cfg as { static?: unknown };
  const snap: Snapshot = { source: "manifest" };
  if (c.static && typeof c.static === "object") {
    const fw = asStaticFramework((c.static as { framework?: unknown }).framework);
    if (fw) snap.static = { framework: fw };
  }
  // If the manifest snapshot had no static block, fall back to filesystem
  // detection so consumers always get something usable.
  if (!snap.static) {
    const fs = detectFromFilesystem(repoRoot);
    return { ...fs, source: "filesystem" };
  }
  return snap;
}

export function readConfigSnapshot(repoRoot: string): Snapshot {
  try {
    const { config } = loadEvalConfig(repoRoot);
    const snap: Snapshot = { source: "config" };
    const fw = asStaticFramework(config.static.framework);
    if (fw) snap.static = { framework: fw };
    return snap;
  } catch {
    return { source: "missing" };
  }
}

function applyFromTo(snap: Snapshot, value: string | undefined): Snapshot {
  if (!value) return snap;
  const out: Snapshot = { ...snap };
  const fw = asStaticFramework(value);
  if (fw) {
    out.static = { framework: fw };
    return out;
  }
  // Unknown: leave as-is. The caller will have warned via stderr.
  return out;
}

// ---------------------------------------------------------------------------
// Filesystem walking helpers
// ---------------------------------------------------------------------------

function listFilesRecursive(
  root: string,
  pred: (relPath: string) => boolean,
): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === ".git") continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
      } else if (st.isFile()) {
        if (pred(full)) out.push(full);
      }
    }
  }
  return out.sort();
}

function pluginDirs(repoRoot: string): string[] {
  const p = join(repoRoot, "plugins");
  if (!existsSync(p)) return [];
  try {
    return readdirSync(p)
      .map((d: string): string => join(p, d))
      .filter((entry: string): boolean => {
        try {
          return statSync(entry).isDirectory();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Allowed-paths guard
// ---------------------------------------------------------------------------

const ALLOWED_PATTERNS: RegExp[] = [
  /^evals(\/|$)/,
  /^plugins\/[^/]+\/evals(\/|$)/,
  /^\.cursor\/evals(\/|$)/,
  /^\.cursor\/skills\/[^/]+\/evals(\/|$)/,
  /^skills\/[^/]+\/evals(\/|$)/,
  /^plugins\/[^/]+\/skills\/[^/]+\/evals(\/|$)/,
  /^plugins\/zoto-eval-system\/templates\/additional\/bats(\/|$)/,
];

export function isPathAllowed(repoRelPath: string): boolean {
  const norm = repoRelPath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
  if (norm.includes("..")) return false;
  return ALLOWED_PATTERNS.some((rx) => rx.test(norm));
}

// ---------------------------------------------------------------------------
// Per-file enumerators
// ---------------------------------------------------------------------------

interface EnumerateResult {
  files: PlanFile[];
  warnings: string[];
}

function enumerateStaticFrameworkAssets(
  repoRoot: string,
  framework: StaticFramework,
): EnumerateResult {
  const files: PlanFile[] = [];
  const warnings: string[] = [];
  const evalsDir = join(repoRoot, "evals");

  if (framework === "pytest") {
    const conftest = join(evalsDir, "conftest.py");
    if (existsSync(conftest)) {
      files.push({
        path: repoRelPosix(conftest, repoRoot),
        kind: "framework-fingerprint",
        reason: "pytest fingerprint (evals/conftest.py)",
      });
    }
    // All test_*.py / *_test.py files under evals/ (excluding _llm/)
    const py = listFilesRecursive(evalsDir, (p) => {
      const rel = repoRelPosix(p, repoRoot);
      if (rel.includes("/_llm/")) return false;
      const base = rel.split("/").pop()!;
      return /^test_[^/]+\.py$/.test(base) || /_test\.py$/.test(base);
    });
    for (const f of py) {
      const rel = repoRelPosix(f, repoRoot);
      if (isGeneratedFile(f)) {
        files.push({
          path: rel,
          kind: "static-test",
          reason: "pytest static-test (generated marker present)",
        });
      } else {
        warnings.push(
          `preserved user-authored: ${rel} (no _meta.generated header)`,
        );
      }
    }
  }
  if (framework === "vitest") {
    const cfg = join(repoRoot, "vitest.config.ts");
    if (existsSync(cfg)) {
      files.push({
        path: repoRelPosix(cfg, repoRoot),
        kind: "framework-fingerprint",
        reason: "vitest fingerprint (vitest.config.ts)",
      });
    }
    const ts = listFilesRecursive(evalsDir, (p) => {
      const rel = repoRelPosix(p, repoRoot);
      if (rel.includes("/_llm/")) return false;
      return rel.toLowerCase().endsWith(".test.ts");
    });
    for (const f of ts) {
      const rel = repoRelPosix(f, repoRoot);
      if (isGeneratedFile(f)) {
        files.push({
          path: rel,
          kind: "static-test",
          reason: "vitest static-test (generated marker present)",
        });
      } else {
        warnings.push(
          `preserved user-authored: ${rel} (no _meta.generated header)`,
        );
      }
    }
  }
  if (framework === "jest") {
    for (const cfgName of ["jest.config.js", "jest.config.ts"]) {
      const cfg = join(repoRoot, cfgName);
      if (existsSync(cfg)) {
        files.push({
          path: repoRelPosix(cfg, repoRoot),
          kind: "framework-fingerprint",
          reason: `jest fingerprint (${cfgName})`,
        });
      }
    }
    const ts = listFilesRecursive(evalsDir, (p) => {
      const rel = repoRelPosix(p, repoRoot);
      if (rel.includes("/_llm/")) return false;
      return rel.toLowerCase().endsWith(".test.ts");
    });
    for (const f of ts) {
      const rel = repoRelPosix(f, repoRoot);
      if (isGeneratedFile(f)) {
        files.push({
          path: rel,
          kind: "static-test",
          reason: "jest static-test (generated marker present)",
        });
      } else {
        warnings.push(
          `preserved user-authored: ${rel} (no _meta.generated header)`,
        );
      }
    }
  }

  return { files, warnings };
}

function collectAllEvalJson(repoRoot: string): string[] {
  const out: string[] = [];
  // skill-level evals
  const skillRoots = [
    join(repoRoot, ".cursor", "skills"),
    join(repoRoot, "skills"),
  ];
  for (const root of skillRoots) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) {
      const dir = join(root, name);
      try {
        if (!statSync(dir).isDirectory()) continue;
      } catch {
        continue;
      }
      const f = join(dir, "evals", "evals.json");
      if (existsSync(f)) out.push(f);
    }
  }
  for (const pd of pluginDirs(repoRoot)) {
    const sk = join(pd, "skills");
    if (existsSync(sk)) {
      try {
        for (const name of readdirSync(sk)) {
          const dir = join(sk, name);
          try {
            if (!statSync(dir).isDirectory()) continue;
          } catch {
            continue;
          }
          const f = join(dir, "evals", "evals.json");
          if (existsSync(f)) out.push(f);
        }
      } catch {
        /* ignore */
      }
    }
  }
  // central evals
  const kinds = ["commands", "agents", "hooks"] as const;
  for (const k of kinds) {
    const cd = join(repoRoot, ".cursor", "evals", k);
    if (existsSync(cd)) {
      for (const fn of readdirSync(cd)) {
        if (fn.endsWith(".json")) out.push(join(cd, fn));
      }
    }
    for (const pd of pluginDirs(repoRoot)) {
      const cd2 = join(pd, "evals", k);
      if (existsSync(cd2)) {
        for (const fn of readdirSync(cd2)) {
          if (fn.endsWith(".json")) out.push(join(cd2, fn));
        }
      }
    }
  }
  return [...new Set(out)].sort();
}

interface ClassifiedEvalJson {
  kind: "all-generated" | "all-user" | "mixed" | "skip";
  reason?: string;
}

function classifyEvalJsonForCleanup(absPath: string): ClassifiedEvalJson {
  let raw: string;
  try {
    raw = readFileSync(absPath, "utf-8");
  } catch {
    return { kind: "skip", reason: "unreadable" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "skip", reason: "invalid JSON" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { kind: "skip", reason: "not a JSON object" };
  }
  const doc = parsed as Record<string, unknown>;
  const rows: unknown[] = [];
  if (Array.isArray(doc.cases)) rows.push(...doc.cases);
  if (Array.isArray(doc.evals)) rows.push(...doc.evals);
  if (rows.length === 0) {
    return { kind: "skip", reason: "no cases" };
  }
  let gen = 0;
  let user = 0;
  for (const r of rows) {
    if (typeof r !== "object" || r === null) {
      return { kind: "skip", reason: "non-object case row" };
    }
    const meta = (r as { _meta?: { generated?: unknown } })._meta;
    if (meta && typeof meta === "object" && meta.generated === true) {
      gen += 1;
    } else {
      user += 1;
    }
  }
  if (gen > 0 && user === 0) return { kind: "all-generated" };
  if (user > 0 && gen === 0) return { kind: "all-user" };
  return { kind: "mixed" };
}

function enumerateBatsTemplateOrphans(repoRoot: string): EnumerateResult {
  const files: PlanFile[] = [];
  const warnings: string[] = [];
  const root = join(
    repoRoot,
    "plugins",
    "zoto-eval-system",
    "templates",
    "additional",
    "bats",
  );
  if (!existsSync(root)) return { files, warnings };
  const all = listFilesRecursive(root, () => true);
  for (const f of all) {
    files.push({
      path: repoRelPosix(f, repoRoot),
      kind: "static-test",
      reason: "orphaned by v2 framework set (bats deprecated)",
    });
  }
  if (files.length > 0) {
    files.push({
      path: repoRelPosix(root, repoRoot),
      kind: "directory",
      reason: "orphaned by v2 framework set (bats deprecated) — empty after files removed",
    });
    warnings.push(
      "bats templates enumerated under reason='removed-target', kind='static-test'/'directory' (closest schema enums; subtask 02 may extend the schema with 'deprecated-template'/'orphaned-template' values).",
    );
  }
  return { files, warnings };
}

function enumerateRemovedTargets(repoRoot: string): EnumerateResult {
  const files: PlanFile[] = [];
  const warnings: string[] = [];
  const globs = loadIgnoreGlobs(repoRoot);
  if (globs.length === 0) return { files, warnings };
  const all = collectAllEvalJson(repoRoot);
  for (const f of all) {
    const rel = repoRelPosix(f, repoRoot);
    const src = deriveSourceFromEvalPathLocal(repoRoot, f);
    if (!src) continue;
    const hit = matchIgnoreGlob(src, globs);
    if (!hit) continue;
    const cls = classifyEvalJsonForCleanup(f);
    if (cls.kind === "all-generated") {
      files.push({
        path: rel,
        kind: "eval-json",
        reason: `target ignored by glob '${hit}'`,
      });
    } else if (cls.kind === "mixed") {
      files.push({
        path: rel,
        kind: "llm-case",
        reason: `target ignored by glob '${hit}' (surgical row deletion only)`,
        preserve_user_authored: true,
      });
      warnings.push(
        `manual_merge_required: ${rel} (mixed user + generated cases under ignored target)`,
      );
    } else {
      warnings.push(
        `preserved user-authored: ${rel} (target ignored by '${hit}' but contains user cases)`,
      );
    }
  }
  return { files, warnings };
}

/**
 * Local copy of the path-derivation routine in eval-cleanup-vendored.ts
 * used to map an eval-JSON path back to its primitive source. We don't import
 * the helper directly because doing so would couple subtask 03 to a function
 * shape owned by the vendored cleanup engine. If this duplication becomes
 * painful, factor a shared module out in a follow-up.
 */
function deriveSourceFromEvalPathLocal(repo: string, evalAbs: string): string | null {
  const rel = repoRelPosix(evalAbs, repo);
  let m: RegExpExecArray | null;
  m = /^\.cursor\/skills\/([^/]+)\/evals\/evals\.json$/.exec(rel) ||
    /^skills\/([^/]+)\/evals\/evals\.json$/.exec(rel);
  if (m) {
    const name = m[1]!;
    return rel.startsWith("skills/")
      ? `skills/${name}/SKILL.md`
      : `.cursor/skills/${name}/SKILL.md`;
  }
  m = /^plugins\/([^/]+)\/skills\/([^/]+)\/evals\/evals\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/skills/${m[2]}/SKILL.md`;
  m = /^\.cursor\/evals\/commands\/([^/.]+)\.json$/.exec(rel);
  if (m) return `.cursor/commands/${m[1]}.md`;
  m = /^plugins\/([^/]+)\/evals\/commands\/([^/.]+)\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/commands/${m[2]}.md`;
  m = /^\.cursor\/evals\/agents\/([^/.]+)\.json$/.exec(rel);
  if (m) return `.cursor/agents/${m[1]}.md`;
  m = /^plugins\/([^/]+)\/evals\/agents\/([^/.]+)\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/agents/${m[2]}.md`;
  m = /^\.cursor\/evals\/hooks\/hooks\.json$/.exec(rel);
  if (m) return ".cursor/hooks/hooks.json";
  m = /^plugins\/([^/]+)\/evals\/hooks\/([^/.]+)\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/hooks/hooks.json`;
  return null;
}

// ---------------------------------------------------------------------------
// Plan computation (top-level)
// ---------------------------------------------------------------------------

export function computePlan(
  repoRoot: string,
  options: ComputeOptions = {},
): CleanupPlan {
  let oldSnap = readManifestSnapshot(repoRoot);
  let newSnap = readConfigSnapshot(repoRoot);

  // If the snapshot has no static block, fall back to filesystem detection.
  if (!newSnap.static) {
    const fs = detectFromFilesystem(repoRoot);
    newSnap = { ...fs, source: fs.source };
  }
  if (!oldSnap.static) {
    const fs = detectFromFilesystem(repoRoot);
    oldSnap = { ...fs, source: fs.source };
  }

  oldSnap = applyFromTo(oldSnap, options.fromOverride);
  newSnap = applyFromTo(newSnap, options.toOverride);

  const groups: PlanGroup[] = [];
  const warnings: string[] = [];

  // 1. Framework switch
  const oldFw = oldSnap.static?.framework;
  const newFw = newSnap.static?.framework;
  if (oldFw && newFw && oldFw !== newFw) {
    const r = enumerateStaticFrameworkAssets(repoRoot, oldFw);
    warnings.push(...r.warnings);
    if (r.files.length > 0) {
      groups.push({
        reason: "framework-switch",
        from: oldFw,
        to: newFw,
        summary: `Static framework switch: ${oldFw} → ${newFw}. Removing ${r.files.length} stale fingerprint/test file(s).`,
        files: r.files,
      });
    }
  }

  // 2. Removed targets (config.ignore globs)
  {
    const r = enumerateRemovedTargets(repoRoot);
    warnings.push(...r.warnings);
    if (r.files.length > 0) {
      groups.push({
        reason: "removed-target",
        summary: `Targets removed via config.ignore — orphaned eval JSON.`,
        files: r.files,
      });
    }
  }

  // 3. Bats template orphan removal (always a candidate; only emitted when
  //    files actually exist on disk).
  {
    const r = enumerateBatsTemplateOrphans(repoRoot);
    warnings.push(...r.warnings);
    if (r.files.length > 0) {
      groups.push({
        reason: "removed-target",
        from: "additionalAutomation:bats",
        summary:
          "Bats templates orphaned by v2 framework set (subtask 13). See warnings for schema-enum coordination note.",
        files: r.files,
      });
    }
  }

  const totalFiles = groups.reduce((acc, g) => acc + g.files.length, 0);

  const plan: CleanupPlan = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generated_by: "eval-cleanup-stale",
    old_snapshot: oldSnap,
    new_snapshot: newSnap,
    groups,
    totals: { files: totalFiles, groups: groups.length },
  };
  if (warnings.length > 0) plan.warnings = warnings;
  return plan;
}

// ---------------------------------------------------------------------------
// Plan hashing & session-token mechanism
// ---------------------------------------------------------------------------

/**
 * Stable, generated-at-independent hash of a plan. We hash only the
 * structural content (groups + snapshots) so two dry-runs of the same
 * filesystem state produce the same hash.
 */
export function planHash(plan: CleanupPlan): string {
  const stable = {
    schema_version: plan.schema_version,
    old_snapshot: plan.old_snapshot,
    new_snapshot: plan.new_snapshot,
    groups: plan.groups,
  };
  return createHash("sha256")
    .update(JSON.stringify(stable, sortedReplacer))
    .digest("hex");
}

function sortedReplacer(_: string, v: unknown): unknown {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const sorted: Record<string, unknown> = {};
    for (const k of keys) sorted[k] = obj[k];
    return sorted;
  }
  return v;
}

interface Lockfile {
  runId: string;
  generated_at: string;
  plan_hash: string;
  ttl: number;
}

const LOCK_DIR = "evals/_runs";
const LOCK_TTL_SECONDS = 3600;

function lockfilePath(repoRoot: string, runId: string): string {
  return join(repoRoot, LOCK_DIR, `.cleanup-token-${runId}.json`);
}

function writeLockfile(repoRoot: string, runId: string, hash: string): Lockfile {
  const dir = join(repoRoot, LOCK_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const lock: Lockfile = {
    runId,
    generated_at: new Date().toISOString(),
    plan_hash: hash,
    ttl: LOCK_TTL_SECONDS,
  };
  writeFileSync(lockfilePath(repoRoot, runId), JSON.stringify(lock, null, 2));
  return lock;
}

function readLockfile(repoRoot: string, runId: string): Lockfile | null {
  const p = lockfilePath(repoRoot, runId);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as Lockfile;
  } catch {
    return null;
  }
}

function findLockfileByHash(repoRoot: string, hash: string): Lockfile | null {
  const dir = join(repoRoot, LOCK_DIR);
  if (!existsSync(dir)) return null;
  for (const fn of readdirSync(dir)) {
    if (!fn.startsWith(".cleanup-token-") || !fn.endsWith(".json")) continue;
    try {
      const lock = JSON.parse(
        readFileSync(join(dir, fn), "utf-8"),
      ) as Lockfile;
      if (lock.plan_hash === hash) return lock;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function generateRunId(hash: string): string {
  const stamp = Math.floor(Date.now() / 1000).toString(36);
  const rand = randomBytes(4).toString("hex");
  return `${stamp}-${rand}-${hash.slice(0, 12)}`;
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

function loadCleanupSchema(repoRoot: string): unknown | null {
  const candidates = [
    join(
      repoRoot,
      "plugins",
      "zoto-eval-system",
      "templates",
      "schema",
      "cleanup-plan.schema.json",
    ),
    join(
      __resolveCallerRoot(),
      "plugins",
      "zoto-eval-system",
      "templates",
      "schema",
      "cleanup-plan.schema.json",
    ),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf-8"));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function __resolveCallerRoot(): string {
  // Resolve the workspace root assuming this file lives at scripts/.
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function validatePlanAgainstSchema(
  plan: CleanupPlan,
  repoRoot: string,
): { ok: true } | { ok: false; errors: string[] } {
  const schema = loadCleanupSchema(repoRoot);
  if (!schema) {
    return {
      ok: false,
      errors: [
        "cleanup-plan.schema.json not found — cannot validate. Looked under repoRoot and script-relative paths.",
      ],
    };
  }
  // ajv exposes itself as default-export under ESM-with-CJS-interop.
  const AjvCtor = (Ajv as unknown as { default?: typeof Ajv }).default ?? Ajv;
  const ajv = new AjvCtor({
    allErrors: true,
    strict: false,
    // ajv ships no built-in `date-time` format unless `ajv-formats` is added;
    // accept everything string-shaped so the warning doesn't pollute stderr.
    formats: { "date-time": true },
  });
  const validate = ajv.compile(schema);
  if (validate(plan)) return { ok: true };
  const errs = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "(root)"} ${e.message ?? ""}`.trim(),
  );
  return { ok: false, errors: errs };
}

// ---------------------------------------------------------------------------
// Apply (deletion) routine
// ---------------------------------------------------------------------------

interface ApplyResult {
  deleted: string[];
  preserved: string[];
  warnings: string[];
}

function applyPlan(repoRoot: string, plan: CleanupPlan): ApplyResult {
  const deleted: string[] = [];
  const preserved: string[] = [];
  const warnings: string[] = [];
  // 1. Refusing-paths guard — pre-validate every file before touching disk.
  for (const g of plan.groups) {
    for (const f of g.files) {
      if (!isPathAllowed(f.path)) {
        throw new Error(
          `refusing to delete path outside allowed roots: ${f.path}`,
        );
      }
    }
  }
  // 2. Perform deletions
  for (const g of plan.groups) {
    for (const f of g.files) {
      const abs = resolve(repoRoot, f.path);
      // mixed evals.json: surgical row deletion (preserve user-authored cases)
      if (f.kind === "llm-case" && f.preserve_user_authored !== false) {
        try {
          surgicallyRewriteEvalJson(abs);
          preserved.push(f.path);
          warnings.push(
            `surgical-rewrite: ${f.path} (kept user-authored cases)`,
          );
        } catch (e) {
          warnings.push(
            `surgical-rewrite-failed: ${f.path} (${(e as Error).message})`,
          );
        }
        continue;
      }
      if (f.kind === "directory") {
        try {
          rmSync(abs, { recursive: false });
          deleted.push(f.path);
        } catch (e) {
          warnings.push(`directory-rm-failed: ${f.path} (${(e as Error).message})`);
        }
        continue;
      }
      try {
        if (existsSync(abs)) {
          unlinkSync(abs);
          deleted.push(f.path);
        }
      } catch (e) {
        warnings.push(`delete-failed: ${f.path} (${(e as Error).message})`);
      }
    }
  }
  return { deleted, preserved, warnings };
}

function surgicallyRewriteEvalJson(absPath: string): void {
  const raw = readFileSync(absPath, "utf-8");
  const doc = JSON.parse(raw) as Record<string, unknown>;
  const filterRows = (rows: unknown[]): unknown[] =>
    rows.filter((r) => {
      if (typeof r !== "object" || r === null) return true;
      const meta = (r as { _meta?: { generated?: unknown } })._meta;
      return !(meta && typeof meta === "object" && meta.generated === true);
    });
  if (Array.isArray(doc.cases)) doc.cases = filterRows(doc.cases);
  if (Array.isArray(doc.evals)) doc.evals = filterRows(doc.evals);
  writeFileSync(absPath, `${JSON.stringify(doc, null, 2)}\n`, "utf-8");
}

function appendHistoryEntry(
  repoRoot: string,
  historyPath: string,
  entry: Record<string, unknown>,
): void {
  const abs = resolve(repoRoot, historyPath);
  const dir = dirname(abs);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const block = `---\n${YAML.stringify(entry)}`;
  appendFileSync(abs, block, "utf-8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface MainOptions {
  repoRoot?: string;
  argv?: string[];
  stdoutWrite?: (s: string) => void;
  stderrWrite?: (s: string) => void;
}

export function runMain(opts: MainOptions = {}): number {
  const repoRoot = resolve(opts.repoRoot ?? process.cwd());
  const argv = opts.argv ?? process.argv.slice(2);
  const stdoutWrite = opts.stdoutWrite ?? ((s) => process.stdout.write(s));
  const stderrWrite = opts.stderrWrite ?? ((s) => process.stderr.write(s));

  const args = parseArgs(argv);

  if (args.help) {
    stdoutWrite(HELP_TEXT);
    return 0;
  }

  // Default to --dry-run when invoked with no mode flag (pnpm `eval:cleanup-stale` contract).
  if (!args.dryRun && !args.apply && !args.check) {
    args.dryRun = true;
  }

  // Mode validation
  const modes = [args.dryRun, args.apply, args.check].filter(Boolean).length;
  if (modes > 1) {
    stderrWrite("error: --dry-run, --apply, and --check are mutually exclusive\n");
    return 1;
  }

  const plan = computePlan(repoRoot, {
    fromOverride: args.from,
    toOverride: args.to,
  });

  // Schema validation — gate on the schema file being present. Always validate
  // so drift in the engine can never silently break the configurer command.
  const validation = validatePlanAgainstSchema(plan, repoRoot);
  if (!validation.ok) {
    stderrWrite(
      `error: emitted plan does not validate against cleanup-plan.schema.json:\n  ${validation.errors.join("\n  ")}\n`,
    );
    return 3;
  }

  // ----- --check ---------------------------------------------------------
  if (args.check) {
    if (plan.totals.files === 0) {
      return 0;
    }
    stderrWrite(
      `drift detected: ${plan.totals.files} stale file(s) across ${plan.groups.length} group(s).\n`,
    );
    return 2;
  }

  // ----- --dry-run -------------------------------------------------------
  if (args.dryRun) {
    const hash = planHash(plan);
    let lock: Lockfile | null = null;
    if (!args.noLockfile) {
      const runId = generateRunId(hash);
      lock = writeLockfile(repoRoot, runId, hash);
      stderrWrite(
        `session token written: runId=${lock.runId} plan_hash=${hash} ttl=${LOCK_TTL_SECONDS}s\n`,
      );
    }
    stdoutWrite(`${JSON.stringify(plan, null, 2)}\n`);
    return 0;
  }

  // ----- --apply ---------------------------------------------------------
  if (args.apply) {
    const hash = planHash(plan);
    if (args.force) {
      stderrWrite(
        "WARNING: --force in use — skipping session-token gate. Intended for non-interactive CI/migration only.\n",
      );
    } else {
      if (!args.session && !args.token) {
        stderrWrite(
          "error: --apply requires --session <runId> or --token <plan_hash>. Run --dry-run first.\n",
        );
        return 1;
      }
      let lock: Lockfile | null = null;
      if (args.session) lock = readLockfile(repoRoot, args.session);
      if (!lock && args.token) lock = findLockfileByHash(repoRoot, args.token);
      if (!lock) {
        stderrWrite(
          "error: no matching session lockfile found. Run --dry-run first (1-hour TTL).\n",
        );
        return 1;
      }
      const lockTime = Date.parse(lock.generated_at);
      if (!Number.isFinite(lockTime)) {
        stderrWrite("error: lockfile has invalid generated_at\n");
        return 1;
      }
      const ageSec = (Date.now() - lockTime) / 1000;
      if (ageSec > lock.ttl) {
        stderrWrite(
          `error: session expired (${Math.round(ageSec)}s > ${lock.ttl}s TTL). Re-run --dry-run.\n`,
        );
        return 1;
      }
      if (lock.plan_hash !== hash) {
        stderrWrite(
          `error: filesystem drift detected — plan_hash differs from lockfile.\n  lockfile: ${lock.plan_hash}\n  current:  ${hash}\nRe-run --dry-run to refresh the plan.\n`,
        );
        return 1;
      }
    }

    let result: ApplyResult;
    try {
      result = applyPlan(repoRoot, plan);
    } catch (e) {
      stderrWrite(`error: ${(e as Error).message}\n`);
      return 1;
    }

    const entry: Record<string, unknown> = {
      migrated_at: new Date().toISOString(),
      from: {
        framework: plan.old_snapshot.static?.framework ?? null,
      },
      to: {
        framework: plan.new_snapshot.static?.framework ?? null,
      },
      deleted: result.deleted,
      kept_user_authored: [
        ...result.preserved,
        ...(plan.warnings ?? [])
          .filter((w) => w.startsWith("preserved user-authored:"))
          .map((w) => w.replace(/^preserved user-authored:\s*/, "").split(" ")[0]),
      ],
      session: {
        runId: args.session ?? "(force-bypass)",
        plan_hash: hash,
      },
    };
    if (result.warnings.length > 0) entry.warnings = result.warnings;
    if (plan.warnings && plan.warnings.length > 0) {
      entry.plan_warnings = plan.warnings;
    }
    appendHistoryEntry(repoRoot, args.manifestHistory, entry);

    // Best-effort: clean up the session lockfile on success.
    if (args.session && !args.force) {
      try {
        rmSync(lockfilePath(repoRoot, args.session));
      } catch {
        /* ignore */
      }
    }

    stdoutWrite(
      `${JSON.stringify(
        {
          applied: true,
          deleted_count: result.deleted.length,
          preserved_count: result.preserved.length,
          warnings: result.warnings,
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  }

  return 1;
}

// Silence ts unused imports for rare cases
void relative;

if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  process.exit(runMain());
}
