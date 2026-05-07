#!/usr/bin/env tsx
/**
 * Eval discovery helper.
 *
 * Walks the configured `skillsRoots` and `discoveryTargets` from
 * `.zoto/eval-system/config.yml` and emits a manifest-shaped JSON
 * payload to stdout. Used by the `zoto-create-evals` and
 * `zoto-update-evals` skills to inventory covered targets.
 *
 * Discovery includes `.cursor/commands`, `.cursor/agents`, and workspace
 * hooks (`.cursor/hooks.json` or `.cursor/hooks/hooks.json`), alongside
 * `plugins/*` assets. Cursor-target IDs default to `command:<name>` /
 * `agent:<name>`; collisions with plugin IDs use `command:cursor/<name>` /
 * `agent:cursor/<name>` (listed under `discovery_config.cursor_namespaced_ids`).
 *
 * Optional `ignore: string[]` in config supplies repo-relative POSIX globs (minimatch);
 * matched targets are dropped from output (see `ignored_summary`). If the full path
 * does not match, the parent directory is also tested so patterns such as
 * `.cursor/skills/crux-*` apply to `crux-…/<file>` (e.g. `SKILL.md`).
 *
 * Run: pnpm exec tsx scripts/eval-discover.ts [--pretty]
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { minimatch } from "minimatch";
import YAML from "yaml";
import { loadEvalConfig, type EvalSystemConfig } from "../plugins/zoto-eval-system/src/config-loader.js";

const REPO_ROOT = resolve(process.cwd());

interface TargetSnapshot {
  id: string;
  kind: "skill" | "command" | "agent" | "hook";
  path: string;
  content_hash: string;
  public_surface?: Record<string, unknown>;
  eval_files: string[];
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function normaliseContent(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
}

function loadConfig(): Record<string, unknown> {
  try {
    return loadEvalConfig(REPO_ROOT).config as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

function loadIgnorePatterns(config: Record<string, unknown>): string[] {
  const raw = config.ignore;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

/** Repo-relative POSIX path segment (Windows paths normalised). */
function toPosixRelPath(repoRelativePath: string): string {
  return repoRelativePath.split("\\").join("/");
}

/** True if repo-relative POSIX path matches a single ignore minimatch pattern. */
function pathMatchesGlob(pathPosix: string, pattern: string): boolean {
  const opts = { dot: true as const };
  if (minimatch(pathPosix, pattern, opts)) return true;
  const slash = pathPosix.lastIndexOf("/");
  if (slash <= 0) return false;
  const parentDir = pathPosix.slice(0, slash);
  return minimatch(parentDir, pattern, opts);
}

/** Drop targets matched by any configured ignore glob; tally per-glob hits on excluded targets. */
function filterTargetsByIgnores(
  targets: TargetSnapshot[],
  ignorePatterns: string[],
): {
  filtered: TargetSnapshot[];
  ignored_summary: {
    count: number;
    by_glob: Record<string, number>;
  };
} {
  if (!ignorePatterns.length) {
    return {
      filtered: targets,
      ignored_summary: { count: 0, by_glob: {} },
    };
  }

  const byGlob: Record<string, number> = Object.fromEntries(
    ignorePatterns.map((g) => [g, 0]),
  );
  let count = 0;
  const filtered: TargetSnapshot[] = [];

  for (const t of targets) {
    const p = toPosixRelPath(t.path);
    let excluded = false;
    for (const pattern of ignorePatterns) {
      if (pathMatchesGlob(p, pattern)) {
        excluded = true;
        byGlob[pattern]++;
      }
    }
    if (excluded) count++;
    else filtered.push(t);
  }

  return { filtered, ignored_summary: { count, by_glob: byGlob } };
}

function expandRoot(rootPattern: string): string[] {
  if (!rootPattern.includes("*")) {
    const abs = resolve(REPO_ROOT, rootPattern);
    return existsSync(abs) && statSync(abs).isDirectory() ? [abs] : [];
  }
  const parts = rootPattern.split("/");
  const idx = parts.indexOf("*");
  if (idx === -1) {
    const abs = resolve(REPO_ROOT, rootPattern);
    return existsSync(abs) && statSync(abs).isDirectory() ? [abs] : [];
  }
  const prefix = resolve(REPO_ROOT, parts.slice(0, idx).join("/"));
  const suffix = parts.slice(idx + 1).join("/");
  if (!existsSync(prefix) || !statSync(prefix).isDirectory()) return [];
  const out: string[] = [];
  for (const entry of readdirSync(prefix).sort()) {
    const candidate = suffix
      ? join(prefix, entry, suffix)
      : join(prefix, entry);
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      out.push(candidate);
    }
  }
  return out;
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = /^---\n([\s\S]*?)\n---/m.exec(raw);
  if (!m) return {};
  const lines = m[1].split("\n");
  const out: Record<string, string> = {};
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { frontmatter: out };
}

function discoverSkills(config: Record<string, unknown>): TargetSnapshot[] {
  const roots = ((config.skillsRoots as string[]) ?? [
    ".cursor/skills",
    "skills",
    "plugins/*/skills",
  ]).flatMap(expandRoot);

  const targets: TargetSnapshot[] = [];
  for (const root of roots) {
    for (const name of readdirSync(root).sort()) {
      const skillDir = join(root, name);
      if (!statSync(skillDir).isDirectory()) continue;
      const skillMd = join(skillDir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const raw = readFileSync(skillMd, "utf-8");
      const evalsPath = join(skillDir, "evals", "evals.json");
      targets.push({
        id: `skill:${name}`,
        kind: "skill",
        path: relative(REPO_ROOT, skillMd),
        content_hash: sha256(normaliseContent(raw)),
        public_surface: parseFrontmatter(raw),
        eval_files: existsSync(evalsPath)
          ? [relative(REPO_ROOT, evalsPath)]
          : [],
      });
    }
  }
  return targets;
}

function discoverPluginAssets(
  kind: "command" | "agent",
  subdir: "commands" | "agents",
): TargetSnapshot[] {
  const pluginsRoot = join(REPO_ROOT, "plugins");
  if (!existsSync(pluginsRoot)) return [];
  const evalLeaf = subdir === "commands" ? "commands" : "agents";
  const out: TargetSnapshot[] = [];
  for (const plugin of readdirSync(pluginsRoot).sort()) {
    const dir = join(pluginsRoot, plugin, subdir);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith(".md")) continue;
      const full = join(dir, file);
      const raw = readFileSync(full, "utf-8");
      const base = file.replace(/\.md$/, "");
      const evalPath = join(pluginsRoot, plugin, "evals", evalLeaf, `${base}.json`);
      out.push({
        id: `${kind}:${file.replace(/\.md$/, "")}`,
        kind,
        path: relative(REPO_ROOT, full),
        content_hash: sha256(normaliseContent(raw)),
        public_surface: parseFrontmatter(raw),
        eval_files: existsSync(evalPath)
          ? [relative(REPO_ROOT, evalPath)]
          : [],
      });
    }
  }
  return out;
}

function discoverHooks(): TargetSnapshot[] {
  const pluginsRoot = join(REPO_ROOT, "plugins");
  if (!existsSync(pluginsRoot)) return [];
  const out: TargetSnapshot[] = [];
  for (const plugin of readdirSync(pluginsRoot).sort()) {
    const hooksJson = join(pluginsRoot, plugin, "hooks", "hooks.json");
    if (!existsSync(hooksJson)) continue;
    const raw = readFileSync(hooksJson, "utf-8");
    const hookEvalPath = join(pluginsRoot, plugin, "evals", "hooks", `${plugin}.json`);
    out.push({
      id: `hook:${plugin}`,
      kind: "hook",
      path: relative(REPO_ROOT, hooksJson),
      content_hash: sha256(normaliseContent(raw)),
      public_surface: { plugin },
      eval_files: existsSync(hookEvalPath)
        ? [relative(REPO_ROOT, hookEvalPath)]
        : [],
    });
  }
  return out;
}

const CURSOR_ROOT = join(REPO_ROOT, ".cursor");

/** Cursor-root commands/agents/hooks discovery; emits namespaced IDs when they collide with plugin asset IDs — see discovery_config.cursor_namespaced_ids. */
function discoverCursorAssets(
  occupiedCommandIds: ReadonlySet<string>,
  occupiedAgentIds: ReadonlySet<string>,
): {
  snapshots: TargetSnapshot[];
  cursor_namespaced_ids: string[];
} {
  const cursor_namespaced_ids: string[] = [];
  const snapshots: TargetSnapshot[] = [];

  function maybeRecordNamespacedId(bareId: string, id: string): void {
    if (id !== bareId) cursor_namespaced_ids.push(id);
  }

  const cmdDir = join(CURSOR_ROOT, "commands");
  if (existsSync(cmdDir) && statSync(cmdDir).isDirectory()) {
    for (const file of readdirSync(cmdDir).sort()) {
      if (!file.endsWith(".md")) continue;
      const full = join(cmdDir, file);
      const raw = readFileSync(full, "utf-8");
      const base = file.replace(/\.md$/, "");
      const bareId = `command:${base}`;
      const id = occupiedCommandIds.has(bareId)
        ? `command:cursor/${base}`
        : bareId;
      maybeRecordNamespacedId(bareId, id);
      const evalPath = join(CURSOR_ROOT, "evals", "commands", `${base}.json`);
      snapshots.push({
        id,
        kind: "command",
        path: relative(REPO_ROOT, full),
        content_hash: sha256(normaliseContent(raw)),
        public_surface: parseFrontmatter(raw),
        eval_files: existsSync(evalPath)
          ? [relative(REPO_ROOT, evalPath)]
          : [],
      });
    }
  }

  const agDir = join(CURSOR_ROOT, "agents");
  if (existsSync(agDir) && statSync(agDir).isDirectory()) {
    for (const file of readdirSync(agDir).sort()) {
      if (!file.endsWith(".md")) continue;
      const full = join(agDir, file);
      const raw = readFileSync(full, "utf-8");
      const base = file.replace(/\.md$/, "");
      const bareId = `agent:${base}`;
      const id = occupiedAgentIds.has(bareId)
        ? `agent:cursor/${base}`
        : bareId;
      maybeRecordNamespacedId(bareId, id);
      const evalPath = join(CURSOR_ROOT, "evals", "agents", `${base}.json`);
      snapshots.push({
        id,
        kind: "agent",
        path: relative(REPO_ROOT, full),
        content_hash: sha256(normaliseContent(raw)),
        public_surface: parseFrontmatter(raw),
        eval_files: existsSync(evalPath)
          ? [relative(REPO_ROOT, evalPath)]
          : [],
      });
    }
  }

  const hooksNested = join(CURSOR_ROOT, "hooks", "hooks.json");
  const hooksFlat = join(CURSOR_ROOT, "hooks.json");
  let hooksPath: string | null = null;
  if (existsSync(hooksNested)) hooksPath = hooksNested;
  else if (existsSync(hooksFlat)) hooksPath = hooksFlat;
  if (hooksPath) {
    const raw = readFileSync(hooksPath, "utf-8");
    const hookEvalPath = join(CURSOR_ROOT, "evals", "hooks", "hooks.json");
    snapshots.push({
      id: "hook:cursor-workspace",
      kind: "hook",
      path: relative(REPO_ROOT, hooksPath),
      content_hash: sha256(normaliseContent(raw)),
      public_surface: { workspace: ".cursor" },
      eval_files: existsSync(hookEvalPath)
        ? [relative(REPO_ROOT, hookEvalPath)]
        : [],
    });
  }

  return { snapshots, cursor_namespaced_ids };
}

function discoverTargets(
  config: Record<string, unknown>,
): {
  targets: TargetSnapshot[];
  cursor_namespaced_ids: string[];
} {
  const kinds =
    (config.discoveryTargets as string[] | undefined) ?? ["skill"];

  const pluginCommands =
    kinds.includes("command") ? discoverPluginAssets("command", "commands") : [];
  const pluginAgents =
    kinds.includes("agent") ? discoverPluginAssets("agent", "agents") : [];

  const occupiedCommandIds = new Set(pluginCommands.map((t) => t.id));
  const occupiedAgentIds = new Set(pluginAgents.map((t) => t.id));

  const needCursor =
    kinds.includes("command") ||
    kinds.includes("agent") ||
    kinds.includes("hook");
  const { snapshots: cursorSnapshots, cursor_namespaced_ids } = needCursor
    ? discoverCursorAssets(occupiedCommandIds, occupiedAgentIds)
    : { snapshots: [] as TargetSnapshot[], cursor_namespaced_ids: [] as string[] };

  const cursorCommands = cursorSnapshots.filter((t) => t.kind === "command");
  const cursorAgents = cursorSnapshots.filter((t) => t.kind === "agent");
  const cursorHooks = cursorSnapshots.filter((t) => t.kind === "hook");

  const all: TargetSnapshot[] = [];
  if (kinds.includes("skill")) all.push(...discoverSkills(config));
  if (kinds.includes("command")) {
    all.push(...pluginCommands);
    all.push(...cursorCommands);
  }
  if (kinds.includes("agent")) {
    all.push(...pluginAgents);
    all.push(...cursorAgents);
  }
  if (kinds.includes("hook")) {
    all.push(...discoverHooks());
    all.push(...cursorHooks);
  }
  return { targets: all, cursor_namespaced_ids };
}

function main(): number {
  const pretty = process.argv.includes("--pretty");
  const config = loadConfig();
  const ignorePatterns = loadIgnorePatterns(config);
  const { targets: rawTargets, cursor_namespaced_ids } = discoverTargets(config);
  const { filtered: targets, ignored_summary } = filterTargetsByIgnores(
    rawTargets,
    ignorePatterns,
  );
  const payload = {
    schema_version: 1,
    discovery_config: {
      discoveryTargets: config.discoveryTargets ?? ["skill"],
      skillsRoots: config.skillsRoots ?? [".cursor/skills", "skills"],
      evalsDir: config.evalsDir ?? "evals",
      additionalAutomation: config.additionalAutomation ?? [],
      cursorRoot: ".cursor",
      cursor_namespaced_ids,
      ignore: ignorePatterns,
    },
    ignored_summary,
    summary: {
      total: targets.length,
      by_kind: targets.reduce<Record<string, number>>((acc, t) => {
        acc[t.kind] = (acc[t.kind] ?? 0) + 1;
        return acc;
      }, {}),
      with_coverage: targets.filter((t) => t.eval_files.length > 0).length,
    },
    targets,
  };
  console.log(pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload));
  return 0;
}

process.exit(main());
