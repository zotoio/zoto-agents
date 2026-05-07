#!/usr/bin/env tsx
/**
 * Primitive analyser for the eval system.
 *
 * Two flows live in this module:
 *
 * 1. Legacy heuristic flow (`analyse`, `AnalysisPayload`, `defaultTwoCases`,
 *    `buildHookCases`, …). Synchronous, deterministic, no LLM. Kept for
 *    backwards compatibility with `eval-stamp.ts` fallbacks and offline use.
 *
 * 2. LLM-driven flow (`runAnalyser`, `AnalyserPayload`, `AnalyserCase`, …).
 *    Spawns a Cursor SDK subagent per primitive, parses a strict JSON payload,
 *    validates against `templates/schema/analyser-payload.schema.json`, and
 *    caches by `sha256(normalised content + analyser_version + model_id)`.
 *    See subtask 04 of the eval-system-v2 spec.
 *
 * Usage: tsx scripts/eval-analyse.ts [--target <path-or-target-id>] [--pretty]
 *        [--max-calls <n>] [--concurrency <n>] [--legacy] [--out <file>]
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { loadEvalConfig } from "../plugins/zoto-eval-system/src/config-loader.js";

const REPO_ROOT = resolve(process.cwd());

export function normaliseContent(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
}

export function repoRelPosix(absPath: string, repoRoot: string = REPO_ROOT): string {
  return relative(repoRoot, absPath).replace(/\\/g, "/");
}

export function sha256(s: string): string {
  return createHash("sha256").update(s, "utf-8").digest("hex");
}

export type TargetKind = "skill" | "command" | "agent" | "hook";

export interface ResolvedTarget {
  kind: TargetKind;
  /** e.g. command:zoto-eval-create */
  targetId: string;
  /** Short identifier (skill name, command name, ...) */
  name: string;
  sourcePath: string;
  pluginDir: string | null;
}

interface CaseFixtureFile {
  path: string;
  content?: string;
  from?: string;
}

interface SuggestedFixtureSet {
  files: CaseFixtureFile[];
}

interface SuggestedFilesystem {
  created?: string[];
  modified?: string[];
  removed?: string[];
  unchanged?: string[];
}

export interface SuggestedCase {
  id: number;
  scenario?: string;
  prompt: string;
  fixtures?: SuggestedFixtureSet;
  expected_filesystem?: SuggestedFilesystem;
  expected_output?: string;
  assertions: string[];
  graders: Record<string, unknown>[];
}

export interface AnalysisPayload {
  target_id: string;
  kind: TargetKind;
  source_path: string;
  source_hash: string;
  frontmatter: Record<string, unknown>;
  operates_on: string[];
  side_effects: {
    creates: string[];
    modifies: string[];
    preserves: string[];
    removes: string[];
  };
  tools_invoked: string[];
  interaction_pattern: string;
  suggested_cases: SuggestedCase[];
}

/** Loads optional `ignore` globs from `.zoto/eval-system/config.yml`. */
export function loadIgnoreGlobs(repoRoot: string = REPO_ROOT): string[] {
  try {
    return loadEvalConfig(repoRoot).config.ignore;
  } catch {
    return [];
  }
}

function globToRegex(pattern: string): RegExp {
  let out = "^";
  for (let i = 0; i < pattern.length; ) {
    const two = pattern.slice(i, i + 2);
    if (two === "**") {
      out += ".*";
      i += 2;
      continue;
    }
    const ch = pattern[i];
    if (ch === "*") out += "[^/]*";
    else if ("+.^${}()|[]\\".includes(ch)) out += `\\${ch}`;
    else out += ch;
    i += 1;
  }
  return new RegExp(`${out}$`);
}

function parentChain(path: string): string[] {
  const p = path.replace(/^\/+/, "").replace(/^\.\//, "");
  const chain: string[] = [];
  let cur = p;
  for (;;) {
    chain.push(cur);
    const slash = cur.lastIndexOf("/");
    if (slash <= 0) break;
    cur = cur.slice(0, slash);
  }
  return chain;
}

export function matchIgnoreGlob(
  repoRelativePosix: string,
  globs: string[],
): string | null {
  const norm = repoRelativePosix.replace(/^\/+/, "").replace(/^\.\//, "");
  const chain = parentChain(norm);
  for (const g of globs) {
    const gTrim = g.replace(/^\/+/, "").trim();
    if (!gTrim) continue;
    const rx = globToRegex(gTrim);
    for (const c of chain) {
      if (rx.test(c)) return g;
    }
    if (!gTrim.includes("**")) {
      const rxDesc = globToRegex(`${gTrim}/**`);
      if (rxDesc.test(norm)) return g;
    }
  }
  return null;
}

function pluginsDirs(repoRoot: string = REPO_ROOT): string[] {
  const p = join(repoRoot, "plugins");
  if (!existsSync(p)) return [];
  return readdirSync(p).map((d) => join(p, d));
}

function readFrontmatter(md: string): {
  fm: Record<string, unknown>;
  body: string;
} {
  if (!md.startsWith("---\n")) return { fm: {}, body: md };
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) return { fm: {}, body: md };
  const fmRaw = md.slice(4, end);
  const body = md.slice(end + 5);
  const fm: Record<string, unknown> = {};
  for (const line of fmRaw.split("\n")) {
    const m = line.match(/^([\w.-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2]?.trim() ?? "";
    val = val.replace(/^"|"$/g, "");
    fm[key] = val;
  }
  return { fm, body };
}

/** First existing path wins. `repoRoot` defaults to `process.cwd()` for
 * backwards compatibility; tests can override it. */
export function resolveTarget(
  targetId: string,
  repoRoot: string = REPO_ROOT,
): ResolvedTarget | null {
  const m = /^([a-z]+):(.+)$/.exec(targetId.trim());
  if (!m) return null;
  const kind = m[1] as TargetKind;
  const rawName = m[2].trim();
  if (
    kind !== "skill" &&
    kind !== "command" &&
    kind !== "agent" &&
    kind !== "hook"
  )
    return null;

  if (kind === "hook") {
    if (rawName === "cursor" || rawName === "cursor-workspace") {
      const a = join(repoRoot, ".cursor", "hooks", "hooks.json");
      const b = join(repoRoot, ".cursor", "hooks.json");
      const picked = existsSync(a) ? a : b;
      if (!existsSync(picked)) return null;
      if (rawName === "cursor") {
        process.stderr.write(
          JSON.stringify({
            warning: "deprecated_target_alias",
            from: "hook:cursor",
            to: "hook:cursor-workspace",
          }) + "\n",
        );
      }
      return {
        kind: "hook",
        /** Canonical id matches `eval-discover.ts`. `cursor` is a deprecated alias. */
        targetId: "hook:cursor-workspace",
        name: "cursor-workspace",
        sourcePath: picked,
        pluginDir: null,
      };
    }
    const hookPath = join(
      repoRoot,
      "plugins",
      rawName,
      "hooks",
      "hooks.json"
    );
    if (!existsSync(hookPath)) return null;
    return {
      kind: "hook",
      targetId: `hook:${rawName}`,
      name: rawName,
      sourcePath: hookPath,
      pluginDir: join(repoRoot, "plugins", rawName),
    };
  }

  if (kind === "skill") {
    const cand = [
      join(repoRoot, ".cursor", "skills", rawName, "SKILL.md"),
      join(repoRoot, "skills", rawName, "SKILL.md"),
      ...pluginsDirs(repoRoot).map((pd) =>
        join(pd, "skills", rawName, "SKILL.md")
      ),
    ];
    for (const c of cand) {
      if (existsSync(c)) {
        let pluginDir: string | null = null;
        const rel = relative(repoRoot, c);
        const pm = rel.match(/^plugins\/([^/]+)\//);
        if (pm) pluginDir = join(repoRoot, "plugins", pm[1]);
        return {
          kind: "skill",
          targetId,
          name: rawName,
          sourcePath: c,
          pluginDir,
        };
      }
    }
    return null;
  }

  if (kind === "command") {
    const cand = [
      join(repoRoot, ".cursor", "commands", `${rawName}.md`),
      ...pluginsDirs(repoRoot).map((pd) =>
        join(pd, "commands", `${rawName}.md`)
      ),
    ];
    for (const c of cand) {
      if (existsSync(c)) {
        let pluginDir: string | null = null;
        const rel = relative(repoRoot, c);
        const pm = rel.match(/^plugins\/([^/]+)\//);
        if (pm) pluginDir = join(repoRoot, "plugins", pm[1]);
        return {
          kind: "command",
          targetId,
          name: rawName,
          sourcePath: c,
          pluginDir,
        };
      }
    }
    return null;
  }

  // agent
  const cand = [
    join(repoRoot, ".cursor", "agents", `${rawName}.md`),
    ...pluginsDirs(repoRoot).map((pd) => join(pd, "agents", `${rawName}.md`)),
  ];
  for (const c of cand) {
    if (existsSync(c)) {
      let pluginDir: string | null = null;
      const rel = relative(repoRoot, c);
      const pm = rel.match(/^plugins\/([^/]+)\//);
      if (pm) pluginDir = join(repoRoot, "plugins", pm[1]);
      return {
        kind: "agent",
        targetId,
        name: rawName,
        sourcePath: c,
        pluginDir,
      };
    }
  }
  return null;
}

const TOOL_TERMS = [
  ["Read", "Read"],
  ["Write", "Write"],
  ["Edit", "Edit"],
  ["StrReplace", "StrReplace"],
  ["Shell", "shell"],
  ["shell(", "shell"],
  ["askQuestion", "askQuestion"],
  ["Task ", "Task"],
  ["spawn", "Task"],
  ["explore", "explore"],
  ["needs_user_input", "needs_user_input"],
];

const PATH_CHUNK =
  /`([^`\n]{1,480})`|"(\.{0,2}\/[^\n"]{1,460})"|'(\.{0,2}\/[^\n']{1,460})'/g;

function uniqSorted(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function heuristicPaths(text: string): string[] {
  const found: string[] = [];
  let rm: RegExpExecArray | null;
  PATH_CHUNK.lastIndex = 0;
  while ((rm = PATH_CHUNK.exec(text)) !== null) {
    const g = rm[1] ?? rm[2] ?? rm[3];
    if (!g || g.includes("{{")) continue;
    if (
      g.includes("/") ||
      g.endsWith(".json") ||
      g.endsWith(".md") ||
      g.endsWith(".yml") ||
      g.endsWith(".yaml") ||
      g.endsWith(".ts") ||
      g.endsWith(".py") ||
      g.endsWith(".mjs")
    ) {
      found.push(g.replace(/^\/+/, ""));
    }
  }
  /* brace patterns like `{evalsDir}/` */
  for (const m of text.matchAll(/\{([\w.-]+)\}\/([\w./%-]+)/g)) {
    found.push(`${m[1]}/${m[2]}`.replace(/^\/+/, ""));
  }
  /* manifest-style paths */
  for (const m of text.matchAll(
    /\.zoto\/eval-system\/[\w.-]+/gi
  )) {
    found.push(m[0]);
  }
  return uniqSorted(found).slice(0, 120);
}

const VERB_CREATES =
  /\b(writes|write|creates|create|stamps|stamp|copies|copy|generate|generate|APPEND(?:S)?)\b/;
const VERB_MODIFIES =
  /\b(modifies|modify|updates?|patch(?:es)?|merge|merges|appends?)\b/;
const VERB_REMOVE = /\b(remove|delete|purge|unlink)\b/;

function sideEffectBuckets(fullText: string, paths: string[]): {
  creates: string[];
  modifies: string[];
  preserves: string[];
  removes: string[];
} {
  const creates: string[] = [];
  const modifies: string[] = [];
  const removes: string[] = [];
  for (const p of paths) {
    const bn = basenamePath(p);
    const ctx = fullText
      .split("\n")
      .filter((ln) => ln.includes(p) || ln.includes(bn))
      .join("\n")
      .toLowerCase();
    if (!ctx) continue;
    if (VERB_REMOVE.test(ctx)) {
      removes.push(p);
      continue;
    }
    if (VERB_CREATES.test(ctx) && !VERB_MODIFIES.test(ctx)) creates.push(p);
    else if (VERB_MODIFIES.test(ctx)) modifies.push(p);
    else if (
      /manifest|package\.json|evals\.json|history\.yml/i.test(p)
    )
      modifies.push(p);
    else if (VERB_CREATES.test(fullText.toLowerCase())) creates.push(p);
  }

  const preserves =
    /\bpreserve/i.test(fullText) && /\buser[\s_-]*authored|\bgenerated\b|===\s*false/i.test(fullText)
      ? ["existing user-authored eval cases", "cases with _meta.generated === false"].sort()
      : ["documented invariant paths until explicit mutate"].sort();

  return {
    creates: uniqSorted(creates),
    modifies: uniqSorted(modifies.filter((x) => !creates.includes(x))),
    removes: uniqSorted(removes),
    preserves,
  };
}

function basenamePath(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

function toolsFromText(fullText: string): string[] {
  const out: string[] = [];
  for (const [needle, canon] of TOOL_TERMS) {
    if (fullText.includes(needle) && !out.includes(canon)) out.push(canon);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function interactionFor(kind: TargetKind, fm: Record<string, unknown>): string {
  if (kind === "command") return "command — owns askQuestion";
  if (kind === "hook")
    return "hook — non-interactive event handler invoked by Cursor hooks.json";
  if (kind === "agent") {
    const nm = String(fm.name ?? "");
    if (/generator|executor|judg|configure|compare|manager/i.test(nm))
      return "subagent — uses needs_user_input";
    return "subagent — receives pre-collected answers, uses needs_user_input on mid-flight gaps";
  }
  return "subagent — uses needs_user_input";
}

function wsPath(rel: string): string {
  return rel.startsWith("workspace/") ? rel : join("workspace", rel).replace(/\\/g, "/");
}

function concretePaths(paths: string[]): string[] {
  return paths.filter((p) => {
    const t = p.trim();
    const pathLike =
      t.includes("/") ||
      t.startsWith(".") ||
      /\.(json|yml|yaml|md|ts|py|mjs|tsx)$/i.test(t);
    return (
      pathLike &&
      t.length > 0 &&
      !/[<*{}]/.test(t) &&
      !/…|\.\.+/.test(t) &&
      !/<[^>]{1,200}>/.test(t) &&
      !/\*|\.\*$/.test(t)
    );
  });
}

function hooksJsonHandlers(
  hooksObj: Record<string, unknown>
): Array<{ phase: string; command: string; description: string }> {
  const hooks = hooksObj.hooks as Record<string, unknown[]> | undefined;
  if (!hooks || typeof hooks !== "object") return [];
  const out: Array<{ phase: string; command: string; description: string }> =
    [];
  const phases = ["sessionStart", "afterFileEdit", "stop", "beforeShellExecution"];
  for (const phase of phases) {
    const arr = hooks[phase];
    if (!Array.isArray(arr)) continue;
    for (const row of arr) {
      const cmd =
        typeof row.command === "string" ? row.command : "";
      const desc =
        typeof row.description === "string" ? row.description : "";
      out.push({ phase, command: cmd, description: desc });
    }
  }
  return out;
}

function expandHookCommandFiles(cmd: string): string[] {
  const pm = /\b(?:node|python3)\s+([^\s]+)/i.exec(cmd);
  return pm ? [pm[1].replace(/^["']|["']$/g, "")] : [];
}

function buildHookCases(
  resolved: ResolvedTarget,
  fm: Record<string, unknown>,
  handlers: Array<{ phase: string; command: string; description: string }>
): SuggestedCase[] {
  const relHooks = relative(REPO_ROOT, resolved.sourcePath);
  const pkgName = fm.name ?? resolved.name ?? "hooks";
  return handlers.map((h, idx) => {
    const refs = expandHookCommandFiles(h.command).filter(Boolean);
    const fixFiles: CaseFixtureFile[] = [
      {
        path: wsPath(relHooks.replace(/\\/g, "/")),
        from: relHooks.replace(/\\/g, "/"),
      },
    ];
    for (const rf of uniqSorted(refs)) {
      const stripped = rf.replace(/^\.\//, "");
      const abs = resolve(REPO_ROOT, stripped);
      const tryRel = existsSync(abs)
        ? relative(REPO_ROOT, abs).replace(/\\/g, "/")
        : stripped;
      const entry: CaseFixtureFile = {
        path: wsPath(tryRel),
      };
      if (existsSync(abs)) entry.from = tryRel.replace(/\\/g, "/");
      else entry.content = `# missing on disk fixture for ${stripped}`;
      fixFiles.push(entry);
    }

    const createdPaths = uniqSorted([
      `hook-events/${resolved.name}/${h.phase}/${idx + 1}/stdout.json`,
      ...refs.flatMap((r) => {
        const stripped = r.replace(/^\.\//, "");
        const abs = resolve(REPO_ROOT, stripped);
        return existsSync(abs)
          ? [wsPath(relative(REPO_ROOT, abs).replace(/\\/g, "/"))]
          : [];
      }),
    ]).slice(0, 16);

    return {
      id: idx + 1,
      scenario: `${h.phase} handler: ${basenamePath(h.command) || "(empty command)"}`,
      prompt: [
        `Exercise the Cursor hook lifecycle for hook plugin '${String(pkgName)}' during phase '${h.phase}'.`,
        `Hook command line: ${h.command}`,
        `Description: ${h.description}`,
        "Confirm stdout JSON contract and absence of blocking prompts.",
      ].join("\n"),
      fixtures: { files: fixFiles },
      expected_filesystem: {
        created:
          createdPaths.length > 0
            ? createdPaths
            : [`hook-run/${resolved.name}/${idx + 1}/last-exit-status`],
        modified: uniqSorted(fixFiles.map((f) => f.path)),
      },
      expected_output:
        `Exit status 0; hook script ${basenamePath(h.command) || "(none)"} completed without prompting.`,
      assertions: [
        `${h.phase} hook entry ran the configured script without unresolved needs_user_input`,
        "No askQuestion emitted from hook binaries — stdin/stdout hooks channel only",
        h.description.length > 28
          ? `Behaviour matched hooks.json description excerpt: ${h.description.slice(0, 80)}`
          : "hooks.json registered description aligns with observable hook behaviour",
      ],
      graders: [],
    };
  });
}

function defaultTwoCases(
  resolved: ResolvedTarget,
  fullText: string,
  fm: Record<string, unknown>,
  side: AnalysisPayload["side_effects"],
  operates: string[]
): SuggestedCase[] {
  const relSelf = relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/");
  const displayName =
    resolved.kind === "skill"
      ? String(fm.name ?? resolved.name)
      : resolved.name;
  const configHint = operates.some((x) => x.includes("zoto-eval-system"))
    ? "workspace/.zoto/eval-system/config.yml"
    : null;

  const baseFixtures: CaseFixtureFile[] = [
    {
      path: wsPath(relSelf),
      from: relSelf,
    },
  ];
  if (configHint && existsSync(join(REPO_ROOT, ".zoto", "eval-system", "config.yml"))) {
    baseFixtures.unshift({
      path: configHint,
      from: ".zoto/eval-system/config.yml",
    });
  } else if (configHint) {
    baseFixtures.unshift({
      path: configHint,
      content:
        '{"evalsDir":"evals","skillsRoots":["skills"],"discoveryTargets":["skill","command","agent","hook"],"llm":{"runtime":"tsx","model":{"id":"composer-2"}},"judgeModel":"opus-4.6"}',
    });
  }

  const createsWs = uniqSorted(
    concretePaths([
      ...side.creates.map((p) => wsPath(p.replace(/^\//, ""))),
      "workspace/.zoto/eval-system/manifest.yml",
    ])
  )
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 20);

  const modifiesWs = uniqSorted(
    concretePaths([
      ...side.modifies.map((p) => wsPath(p.replace(/^\//, ""))),
      "workspace/package.json",
    ])
  ).slice(0, 20);

  const edgeMissingConfig =
    /config\.json.*absent|missing.*config|\bConfigure\b|\bNeeds.*config/i.test(fullText);

  const assertionsHappy: string[] = [
    `Primitive '${displayName}' followed documented sequencing for ${resolved.kind} targets`,
    "Hybrids respected: command-layer askQuestion only when declaring command ownership elsewhere",
    "Referenced paths from the corpus were honoured without silent destructive overrides",
  ];

  let case2Assertions: string[];
  let case2Scenario: string;
  let case2Filesystem: SuggestedFilesystem;
  const baseFs: SuggestedFilesystem = {
    created: createsWs.length ? createsWs : ["workspace/tmp/.eval-stub"],
    modified: modifiesWs.length ? modifiesWs : [wsPath(relSelf)],
    unchanged: uniqSorted(side.preserves),
  };

  if (edgeMissingConfig && configHint) {
    case2Scenario = "operator begins without writable eval-system config yet";
    case2Assertions = [
      `Surfaced structured needs_user_input when ${configHint} was absent`,
      "No scaffolding wrote manifest artefacts before configuration availability was confirmed",
    ];
    case2Filesystem = {
      created: [],
      modified: [],
      unchanged: uniqSorted(["workspace/package-lock.json", wsPath(relSelf)]),
    };
  } else if (/\bidempotent|noop|already exists|no-op\b/i.test(fullText)) {
    case2Scenario = "idempotent replay — duplicates do not mutate user-authored artefacts";
    case2Assertions = [
      "Second invocations left user-authored `_meta.generated: false` cases untouched",
      "Generated-only rows updated metadata hashes while preserving assertion order constraints",
    ];
    case2Filesystem = {
      created: [],
      modified: modifiesWs.slice(0, 3),
      unchanged: uniqSorted(side.preserves),
    };
  } else {
    case2Scenario = "edge ambiguity — minimally specified user message";
    case2Assertions = [
      "Ambiguous prompts returned clarifying guidance or YAML needs_user_input without guessing filenames",
      "No silent selection among mutually exclusive branching paths absent explicit approval tokens",
    ];
    case2Filesystem = {
      created: [],
      modified: modifiesWs.slice(0, 2),
      unchanged: uniqSorted([wsPath(relSelf), ...side.preserves]),
    };
  }

  const partialThin = fullText.length < 800;

  const c1: SuggestedCase = {
    id: 1,
    scenario: "happy path — typical authorised invocation",
    prompt: [
      `Drive the '${displayName}' ${resolved.kind} through its primary documented flow.`,
      "Assume repository already passes template validation gates.",
      resolved.pluginDir
        ? `Host plugin root for this primitive: workspace/${relative(REPO_ROOT, resolved.pluginDir).replace(/\\/g, "/")}/`
        : "Host resides under workspace/",
    ].join("\n"),
    fixtures: { files: baseFixtures },
    expected_filesystem: baseFs,
    expected_output:
      resolved.kind === "command"
        ? "askQuestion checkpoints completed once; generator task spawned with enumerated approvals."
        : "Sub-agent completed loop or yielded needs_user_input with structured blocker fields only.",
    assertions: assertionsHappy,
    graders: [],
  };

  const c2: SuggestedCase = {
    id: 2,
    scenario: case2Scenario,
    prompt:
      resolved.kind === "command"
        ? `Operator omits checklist detail for ${displayName}: require command-owned recovery.`
        : `Minimal prompt for '${displayName}' with missing optional context.`,
    fixtures: {
      files: partialThin
        ? baseFixtures
        : [...baseFixtures, {
            path: "workspace/tmp/ambiguous-request.txt",
            content: "// thin context\n",
          }],
    },
    expected_filesystem: case2Filesystem,
    expected_output: "Deterministic escalation path without overwriting protected assets.",
    assertions: case2Assertions,
    graders: [],
  };

  /* Mark partial thin bodies */
  void partialThin;

  return [c1, c2];
}

export interface IgnoredPayload {
  ignored: true;
  target_id: string;
  matched_glob: string;
  source_path: string;
}

export function analyse(
  targetIdRaw: string,
): AnalysisPayload | IgnoredPayload | { error: string; target_id: string } {
  const target_id = targetIdRaw.trim();
  const resolved = resolveTarget(target_id);
  if (!resolved) return { error: "target not found", target_id };

  const sourceRel = relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/");
  const ignoreGlobs = loadIgnoreGlobs();
  const matched = matchIgnoreGlob(sourceRel, ignoreGlobs);
  if (matched) {
    return {
      ignored: true,
      target_id: resolved.targetId,
      matched_glob: matched,
      source_path: sourceRel,
    };
  }

  const raw = readFileSync(resolved.sourcePath, "utf-8");
  const source_hash = sha256(normaliseContent(raw));

  if (resolved.kind === "hook") {
    try {
      const hooksObj = JSON.parse(raw);
      const fmMeta: Record<string, unknown> = {
        ...(typeof hooksObj.description === "string"
          ? { hook_description: hooksObj.description }
          : {}),
        version: hooksObj.version,
      };
      const rawHandlers = hooksJsonHandlers(hooksObj as Record<string, unknown>);
      /* Drop handlers whose script path matches an ignore glob (vendored upstream handlers). */
      const handlers = rawHandlers.filter((h) => {
        const cmd = String(h.command ?? "");
        const scriptMatch = cmd.match(/(\.cursor\/hooks\/[A-Za-z0-9_./-]+)/);
        if (!scriptMatch) return true;
        return matchIgnoreGlob(scriptMatch[1], ignoreGlobs) === null;
      });
      const fullText =
        handlers.map((h) => `${h.phase} ${h.command} ${h.description}`).join("\n") + raw;

      const operates_on = heuristicPaths(fullText).concat(["hooks.json"]);
      const buckets = sideEffectBuckets(fullText, operates_on);

      let suggested_cases: SuggestedCase[];
      if (handlers.length === 0) {
        suggested_cases = [
          {
            id: 1,
            scenario: "shape sanity — no hook handlers enumerated",
            prompt: `${resolved.targetId} defines hooks.json schema but declares zero runnable handlers.`,
            fixtures: {
              files: [
                {
                  path: wsPath(relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/")),
                  from: relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/"),
                },
              ],
            },
            expected_filesystem: {
              unchanged: ["hooks.schema contract only"],
            },
            assertions: rawHandlers.length === 0
                ? [
                    "Parsed hooks.json conforms to Cursor hooks schema envelope",
                    "Documented absence of runnable commands is surfaced for operators",
                  ]
                : [
                    "Hooks bundle lists commands but downstream generation returned zero cases — operator should rerun eval-stamp after fixing hooks JSON structure",
                  ],
            graders: [],
          },
        ];
      } else {
        suggested_cases = buildHookCases(resolved, fmMeta, handlers);
      }

      const tools_invoked = toolsFromText(JSON.stringify(hooksObj));
      /* hooks usually shell out node/python */
      if (!tools_invoked.includes("shell")) tools_invoked.push("shell");
      tools_invoked.sort((a, b) => a.localeCompare(b));

      return {
        target_id: resolved.targetId,
        kind: "hook",
        source_path: relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/"),
        source_hash,
        frontmatter: fmMeta,
        operates_on,
        side_effects: {
          creates: uniqSorted(["hook stdout JSON", `.cursor/logs/hook-${resolved.name}`]),
          modifies: uniqSorted(["~/.cursor/hooks runtime state"]).slice(0, 12),
          preserves: buckets.preserves,
          removes: buckets.removes,
        },
        tools_invoked,
        interaction_pattern:
          "hook — non-interactive event handler invoked by Cursor hooks.json",
        suggested_cases,
      };
    } catch {
      /* fall through minimal */
      return {
        target_id: resolved.targetId,
        kind: "hook",
        source_path: relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/"),
        source_hash,
        frontmatter: {},
        operates_on: ["hooks.json"],
        side_effects: {
          creates: [],
          modifies: [],
          preserves: [],
          removes: [],
        },
        tools_invoked: [],
        interaction_pattern:
          "hook — non-interactive event handler invoked by Cursor hooks.json",
        suggested_cases: [
          {
            id: 1,
            scenario: "shape sanity — malformed hooks.json",
            prompt: `${resolved.targetId} could not be parsed as strict JSON.`,
            fixtures: {
              files: [
                {
                  path: wsPath(
                    relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/")
                  ),
                  content:
                    "// invalid JSON intentional placeholder — sandbox injects corpus byte-exact snippet",
                },
              ],
            },
            assertions: ["Surface parse error gracefully"],
            graders: [],
          },
        ],
      };
    }
  }

  const { fm, body } = readFrontmatter(raw);
  const fullText = `${String(fm.name ?? "")}\n${String(fm.description ?? "")}\n${body}`;
  const operates_on = heuristicPaths(fullText);
  const buckets = sideEffectBuckets(fullText, operates_on);

  const suggested_cases =
    resolved.kind !== "hook"
      ? defaultTwoCases(resolved, fullText, fm, buckets, operates_on)
      : [];

  return {
    target_id: resolved.targetId,
    kind: resolved.kind,
    source_path: relative(REPO_ROOT, resolved.sourcePath).replace(/\\/g, "/"),
    source_hash,
    frontmatter: fm,
    operates_on,
    side_effects: buckets,
    tools_invoked: toolsFromText(fullText),
    interaction_pattern: interactionFor(resolved.kind, fm),
    suggested_cases,
  };
}

function stableReplacer(key: unknown, val: unknown): unknown {
  if (
    typeof val === "object" &&
    val !== null &&
    !Array.isArray(val)
  ) {
    return Object.keys(val as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = (val as Record<string, unknown>)[k];
        return acc;
      }, {});
  }
  if (Array.isArray(val))
    return val.map((item) =>
      typeof item === "object" && item !== null
        ? JSON.parse(JSON.stringify(item, stableReplacer))
        : item
    );
  return val;
}

/**
 * Canonical hash of analysis output for `_meta.primitive_analysis_hash`,
 * omitting ONLY `source_hash` (bytes identity) — captures heuristic deltas.
 */
export function primitiveAnalysisHash(payload: AnalysisPayload): string {
  const { source_hash: _omit, ...rest } = payload;
  void _omit;
  const canon = JSON.stringify(JSON.parse(JSON.stringify(rest, stableReplacer)));
  return sha256(canon);
}

/* ──────────────────────────────────────────────────────────────────────────
 * LLM-driven analyser (subtask 04)
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Canonical analyser version baked into the cache key. Bump this string when
 * you change the analyser subagent prompt, the JSON contract, or post-processing
 * logic that affects payload content. A bump invalidates every previous cache
 * entry on the next run.
 */
export const ANALYSER_VERSION = "2026.05.03-1";

/**
 * Primitive kinds the analyser supports. `rule` is recognised here but the
 * legacy `resolveTarget` function only handles skill/command/agent/hook —
 * subtask 13 will add rule discovery; `runAnalyser` accepts the kind so future
 * work doesn't need to revisit this contract.
 */
export type PrimitiveKind = "skill" | "command" | "agent" | "hook" | "rule";

export interface AnalyserFixtureFile {
  path: string;
  content?: string;
  /**
   * Repo-relative source path. Mirrored as `from_` in the Python dataclass
   * because `from` is a Python keyword; the parity gate tolerates the rename.
   */
  from?: string;
}

export interface AnalyserFixtures {
  files: AnalyserFixtureFile[];
}

export interface AnalyserExpectedFilesystem {
  created?: string[];
  modified?: string[];
  removed?: string[];
  unchanged?: string[];
}

export interface AnalyserCase {
  scenario: string;
  prompt: string;
  assertions: string[];
  follow_ups?: string[];
  fixtures?: AnalyserFixtures;
  fixture_justifications?: string[];
  expected_filesystem?: AnalyserExpectedFilesystem;
  expected_output?: string;
}

export interface AnalyserPayload {
  schema_version: 1;
  analyser_version: string;
  model_id: string;
  target_id: string;
  kind: PrimitiveKind;
  source_path: string;
  source_hash: string;
  summary: string;
  cases: AnalyserCase[];
}

/**
 * Parity manifest consumed by `scripts/check-analyser-payload-parity.ts`. The
 * shape mirrors the TS `AnalyserPayload` / `AnalyserCase` interfaces above and
 * is the canonical source-of-truth for cross-language drift detection. When a
 * field on the TS side gains/loses optionality, update both the interface and
 * this manifest in the same commit.
 */
export interface ParityField {
  name: string;
  optional: boolean;
}

export interface ParityType {
  /** Type name on the TS side. */
  name: string;
  /** Type name on the Python side (e.g. ``AnalyserFixtureFile``). */
  pythonName: string;
  fields: ParityField[];
  /**
   * Optional rename map for fields whose Python name differs (e.g. `from` →
   * `from_`). Keys are TS names, values are Python names.
   */
  renames?: Record<string, string>;
}

export const ANALYSER_PAYLOAD_PARITY_SPEC: ParityType[] = [
  {
    name: "AnalyserFixtureFile",
    pythonName: "AnalyserFixtureFile",
    renames: { from: "from_" },
    fields: [
      { name: "path", optional: false },
      { name: "content", optional: true },
      { name: "from", optional: true },
    ],
  },
  {
    name: "AnalyserFixtures",
    pythonName: "AnalyserFixtures",
    fields: [{ name: "files", optional: false }],
  },
  {
    name: "AnalyserExpectedFilesystem",
    pythonName: "AnalyserExpectedFilesystem",
    fields: [
      { name: "created", optional: true },
      { name: "modified", optional: true },
      { name: "removed", optional: true },
      { name: "unchanged", optional: true },
    ],
  },
  {
    name: "AnalyserCase",
    pythonName: "AnalyserCase",
    fields: [
      { name: "scenario", optional: false },
      { name: "prompt", optional: false },
      { name: "assertions", optional: false },
      { name: "follow_ups", optional: true },
      { name: "fixtures", optional: true },
      { name: "fixture_justifications", optional: true },
      { name: "expected_filesystem", optional: true },
      { name: "expected_output", optional: true },
    ],
  },
  {
    name: "AnalyserPayload",
    pythonName: "AnalyserPayload",
    fields: [
      { name: "schema_version", optional: false },
      { name: "analyser_version", optional: false },
      { name: "model_id", optional: false },
      { name: "target_id", optional: false },
      { name: "kind", optional: false },
      { name: "source_path", optional: false },
      { name: "source_hash", optional: false },
      { name: "summary", optional: false },
      { name: "cases", optional: false },
    ],
  },
];

export interface AnalyserConfig {
  modelId: string;
  concurrency: number;
  maxCallsPerInvocation: number;
}

const DEFAULT_ANALYSER_CFG: AnalyserConfig = {
  modelId: "composer-2",
  concurrency: 4,
  maxCallsPerInvocation: 50,
};

const ANALYSER_CACHE_REL = ".zoto/eval-system/cache/analyser";
const SUBAGENT_PROMPT_REL =
  "plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md";
const PAYLOAD_SCHEMA_REL =
  "plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json";

/**
 * Read analyser-relevant fields from `.zoto/eval-system/config.yml`. Falls
 * back to documented defaults when the file is missing or malformed.
 */
export function loadAnalyserConfig(
  repoRoot: string = REPO_ROOT,
): AnalyserConfig {
  try {
    const { config } = loadEvalConfig(repoRoot);
    return {
      modelId: config.llm.model.id,
      concurrency: config.analyser.concurrency,
      maxCallsPerInvocation: config.analyser.maxCallsPerInvocation,
    };
  } catch {
    return { ...DEFAULT_ANALYSER_CFG };
  }
}

/**
 * Cache key = sha256(normalised source content + analyser_version + model_id).
 * Bumping the analyser version OR swapping the model invalidates every prior
 * cache entry — the intended behaviour.
 */
export function computeAnalyserCacheKey(args: {
  normalisedSource: string;
  analyserVersion: string;
  modelId: string;
}): string {
  return sha256(
    `${args.normalisedSource}\u0000${args.analyserVersion}\u0000${args.modelId}`,
  );
}

interface SdkRunResult {
  result?: string;
}

interface SdkRun {
  wait: () => Promise<SdkRunResult>;
}

interface SdkAgent {
  send: (prompt: string) => Promise<SdkRun>;
  close?: () => void;
}

/**
 * Minimal SDK surface the analyser actually uses. Tests inject a stub via
 * `runAnalyser({ sdk })`; production code resolves the real `@cursor/sdk`
 * dynamically inside `defaultSdkFactory`.
 */
export interface AnalyserSdk {
  createAgent(opts: {
    apiKey: string;
    model: string;
    cwd: string;
  }): Promise<SdkAgent>;
}

async function defaultSdkFactory(): Promise<AnalyserSdk> {
  const mod = (await import("@cursor/sdk")) as unknown as {
    Agent: {
      create: (opts: {
        apiKey: string;
        model: { id: string };
        local?: { cwd?: string };
      }) => Promise<SdkAgent>;
    };
  };
  return {
    async createAgent({ apiKey, model, cwd }) {
      return mod.Agent.create({
        apiKey,
        model: { id: model },
        local: { cwd },
      });
    },
  };
}

/**
 * The system prompt baked into every analyser SDK call. Read once per
 * invocation. Falls back to a terse inline fallback only if the file is
 * missing (the parity check for the file is owned by subtask 13's docs gate).
 */
function loadSubagentPrompt(repoRoot: string = REPO_ROOT): string {
  const p = join(repoRoot, SUBAGENT_PROMPT_REL);
  if (existsSync(p)) {
    const raw = readFileSync(p, "utf-8");
    return raw.replace(/^---[\s\S]*?\n---\n/, "").trim();
  }
  return [
    "You are the eval-system primitive analyser.",
    "Return ONLY a strict JSON object matching the analyser-payload schema.",
    "No prose, no fences, no commentary.",
  ].join(" ");
}

/**
 * Extract the first balanced JSON object from a possibly noisy LLM response.
 * The subagent prompt forbids prose, but defensive parsing keeps the analyser
 * robust against accidental code-fence wrapping.
 */
function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1]!.trim();
  const idx = trimmed.indexOf("{");
  if (idx === -1) return trimmed;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = idx; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return trimmed.slice(idx, i + 1);
    }
  }
  return trimmed.slice(idx);
}

/**
 * Lazy-loaded Ajv validator for the analyser payload schema.
 */
let _payloadValidator:
  | ((data: unknown) => boolean)
  | null = null;
let _payloadValidatorErrors: unknown[] = [];

async function getPayloadValidator(
  repoRoot: string = REPO_ROOT,
): Promise<{
  validate: (data: unknown) => boolean;
  errors: () => unknown[];
}> {
  if (_payloadValidator) {
    return {
      validate: _payloadValidator,
      errors: () => _payloadValidatorErrors,
    };
  }
  const ajvMod = (await import("ajv")) as { default: new (opts?: unknown) => unknown };
  const Ajv = ajvMod.default;
  const ajv = new Ajv({ allErrors: true, strict: false }) as {
    compile: (schema: unknown) => (data: unknown) => boolean;
    errors: unknown[] | null;
  };
  const schema = JSON.parse(
    readFileSync(join(repoRoot, PAYLOAD_SCHEMA_REL), "utf-8"),
  );
  const compiled = ajv.compile(schema);
  _payloadValidator = (data: unknown) => {
    const ok = compiled(data);
    _payloadValidatorErrors =
      ((compiled as unknown as { errors?: unknown[] }).errors ?? []).slice();
    return ok;
  };
  return {
    validate: _payloadValidator,
    errors: () => _payloadValidatorErrors,
  };
}

export interface RunAnalyserOptions {
  /** Override the resolved analyser config (concurrency, model, budget). */
  config?: Partial<AnalyserConfig>;
  /** Inject a stub SDK for tests. */
  sdk?: AnalyserSdk;
  /** Override the repo root (tests). */
  repoRoot?: string;
  /**
   * When set, replay payloads from `<dir>/<source_hash>.json` instead of
   * calling the LLM. Missing fixture ⇒ throws with the expected path.
   */
  fixtureDir?: string;
  /** Override the on-disk cache directory (tests). */
  cacheDir?: string;
  /** Per-invocation accounting; pass between calls when batching. */
  budget?: AnalyserBudget;
  /** Disable on-disk cache writes (tests). */
  ephemeralCache?: boolean;
  /** Force-bypass the cache. Equivalent to `_meta.primitive_analysis.invalidate`. */
  invalidate?: boolean;
}

export interface AnalyserBudget {
  callsMade: number;
  callsCached: number;
  replayHits: number;
  totalTokensEstimate: number;
  startedAt: number;
}

export interface AnalyserResult {
  payload: AnalyserPayload;
  cacheHit: boolean;
  replayHit: boolean;
  fromDiskCache: boolean;
  source: "fresh" | "cache" | "replay";
}

export interface RunAnalyserTarget {
  /** Either a `<kind>:<name>` target id or a repo-relative path. */
  target: string;
  /** Optional resolved kind override (skips path-derivation). */
  kind?: PrimitiveKind;
}

export function newAnalyserBudget(): AnalyserBudget {
  return {
    callsMade: 0,
    callsCached: 0,
    replayHits: 0,
    totalTokensEstimate: 0,
    startedAt: Date.now(),
  };
}

interface WritableLike {
  write(chunk: string): void;
}

export function emitCostSummary(
  budget: AnalyserBudget,
  stream: WritableLike = process.stderr as unknown as WritableLike,
): void {
  const summary = {
    cost_summary: {
      calls_made: budget.callsMade,
      calls_cached: budget.callsCached,
      replay_hits: budget.replayHits,
      total_tokens_estimate: budget.totalTokensEstimate,
      wall_time_ms: Date.now() - budget.startedAt,
    },
  };
  stream.write(`${JSON.stringify(summary)}\n`);
}

/**
 * Resolve `target` (target-id OR repo-relative path) into a `ResolvedTarget`.
 * Path resolution looks at `kind` hints from the path components.
 */
export function resolveAnalyserTarget(
  target: string,
  repoRoot: string = REPO_ROOT,
): ResolvedTarget | null {
  const trimmed = target.trim();
  if (/^[a-z]+:/.test(trimmed)) return resolveTarget(trimmed, repoRoot);

  const norm = trimmed.replace(/^\.\//, "").replace(/^\/+/, "");
  const abs = resolve(repoRoot, norm);
  if (!existsSync(abs)) return null;
  const rel = relative(repoRoot, abs).replace(/\\/g, "/");

  const skillMatch = rel.match(/(?:^|\/)skills\/([^/]+)\/SKILL\.md$/);
  if (skillMatch) return resolveTarget(`skill:${skillMatch[1]}`, repoRoot);

  const cmdMatch = rel.match(/(?:^|\/)commands\/([^/]+)\.md$/);
  if (cmdMatch) return resolveTarget(`command:${cmdMatch[1]}`, repoRoot);

  const agentMatch = rel.match(/(?:^|\/)agents\/([^/]+)\.md$/);
  if (agentMatch) return resolveTarget(`agent:${agentMatch[1]}`, repoRoot);

  const hookPlugin = rel.match(/^plugins\/([^/]+)\/hooks\/hooks\.json$/);
  if (hookPlugin) return resolveTarget(`hook:${hookPlugin[1]}`, repoRoot);

  if (
    rel === ".cursor/hooks/hooks.json" ||
    rel === ".cursor/hooks.json"
  )
    return resolveTarget("hook:cursor-workspace", repoRoot);

  return null;
}

function readFixturePayload(
  fixtureDir: string,
  sourceHash: string,
): AnalyserPayload {
  const file = join(fixtureDir, `${sourceHash}.json`);
  if (!existsSync(file)) {
    throw new AnalyserError(
      `analyser fixture missing: expected ${file} (source_hash=${sourceHash})`,
      "fixture_missing",
    );
  }
  return JSON.parse(readFileSync(file, "utf-8")) as AnalyserPayload;
}

function readDiskCache(
  cacheDir: string,
  sourceHash: string,
): AnalyserPayload | null {
  const file = join(cacheDir, `${sourceHash}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as AnalyserPayload;
  } catch {
    return null;
  }
}

function writeDiskCache(
  cacheDir: string,
  sourceHash: string,
  payload: AnalyserPayload,
): void {
  mkdirSync(cacheDir, { recursive: true });
  const file = join(cacheDir, `${sourceHash}.json`);
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export class AnalyserError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "AnalyserError";
    this.code = code;
  }
}

function buildAnalyserPrompt(args: {
  systemPrompt: string;
  resolved: ResolvedTarget;
  sourceText: string;
  frontmatter: Record<string, unknown>;
  body: string;
  modelId: string;
  sourceHash: string;
}): string {
  const fmJson = JSON.stringify(args.frontmatter, null, 2);
  const truncatedBody =
    args.body.length > 12000 ? `${args.body.slice(0, 12000)}\n\n…[truncated]` : args.body;
  return [
    args.systemPrompt,
    "",
    "## Required output envelope",
    `\`\`\`json
{
  "schema_version": 1,
  "analyser_version": "${ANALYSER_VERSION}",
  "model_id": "${args.modelId}",
  "target_id": "${args.resolved.targetId}",
  "kind": "${args.resolved.kind}",
  "source_path": "${repoRelPosix(args.resolved.sourcePath)}",
  "source_hash": "${args.sourceHash}",
  "summary": "...",
  "cases": [ ... ]
}
\`\`\``,
    "",
    `## Primitive`,
    `- **target_id**: \`${args.resolved.targetId}\``,
    `- **kind**: \`${args.resolved.kind}\``,
    `- **source_path**: \`${repoRelPosix(args.resolved.sourcePath)}\``,
    "",
    "### Frontmatter",
    "```json",
    fmJson,
    "```",
    "",
    "### Body",
    "```markdown",
    truncatedBody,
    "```",
    "",
    "Return ONLY the JSON object. No prose, no markdown fences in your response.",
  ].join("\n");
}

async function callSdk(
  sdk: AnalyserSdk,
  prompt: string,
  modelId: string,
  cwd: string,
): Promise<string> {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new AnalyserError(
      "CURSOR_API_KEY is not set; analyser cannot call the LLM. Set the env var or run with ZOTO_EVAL_ANALYSER_FIXTURE_DIR=<path> to replay fixtures.",
      "missing_api_key",
    );
  }
  const agent = await sdk.createAgent({ apiKey, model: modelId, cwd });
  try {
    const run = await agent.send(prompt);
    const result = await run.wait();
    return result.result ?? "";
  } finally {
    if (typeof agent.close === "function") {
      try {
        agent.close();
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Heuristic token estimator (≈4 chars/token). Used purely for the cost
 * summary; the analyser does not enforce token budgets.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function assertPayloadJustifications(payload: AnalyserPayload): void {
  for (const c of payload.cases) {
    const filesLen = c.fixtures?.files?.length ?? 0;
    const justLen = c.fixture_justifications?.length ?? 0;
    if (filesLen > 0 && justLen === 0) {
      throw new AnalyserError(
        `case "${c.scenario}" emitted ${filesLen} fixture file(s) without any fixture_justifications — refusing to stamp unjustified overlays`,
        "unjustified_fixtures",
      );
    }
  }
}

function assertPayloadConsistency(
  payload: AnalyserPayload,
  expected: {
    targetId: string;
    kind: PrimitiveKind;
    sourcePath: string;
    sourceHash: string;
    modelId: string;
  },
): void {
  if (payload.schema_version !== 1)
    throw new AnalyserError(
      `analyser payload schema_version=${payload.schema_version}, expected 1`,
      "schema_version",
    );
  if (payload.target_id !== expected.targetId)
    throw new AnalyserError(
      `analyser payload target_id=${payload.target_id}, expected ${expected.targetId}`,
      "target_mismatch",
    );
  if (payload.kind !== expected.kind)
    throw new AnalyserError(
      `analyser payload kind=${payload.kind}, expected ${expected.kind}`,
      "kind_mismatch",
    );
  if (payload.source_hash !== expected.sourceHash)
    throw new AnalyserError(
      `analyser payload source_hash mismatch (got ${payload.source_hash}, expected ${expected.sourceHash})`,
      "source_hash_mismatch",
    );
}

/**
 * Run the LLM analyser for a single primitive. Honours fixture-replay,
 * on-disk cache, and call-budget guardrails. Always updates the supplied
 * `budget` object in place so callers can fan-out and emit a single
 * cost summary at the end.
 */
export async function runAnalyser(
  target: RunAnalyserTarget,
  opts: RunAnalyserOptions = {},
): Promise<AnalyserResult> {
  const repoRoot = opts.repoRoot ?? REPO_ROOT;
  const cfg: AnalyserConfig = {
    ...loadAnalyserConfig(repoRoot),
    ...(opts.config ?? {}),
  };
  const budget = opts.budget ?? newAnalyserBudget();

  const resolved = resolveAnalyserTarget(target.target, repoRoot);
  if (!resolved) {
    throw new AnalyserError(
      `analyser cannot resolve target: ${target.target}`,
      "target_unresolved",
    );
  }

  const raw = readFileSync(resolved.sourcePath, "utf-8");
  const normalised = normaliseContent(raw);
  const sourceHash = computeAnalyserCacheKey({
    normalisedSource: normalised,
    analyserVersion: ANALYSER_VERSION,
    modelId: cfg.modelId,
  });

  const sourceRelPath = relative(repoRoot, resolved.sourcePath).replace(
    /\\/g,
    "/",
  );
  const expected = {
    targetId: resolved.targetId,
    kind: resolved.kind as PrimitiveKind,
    sourcePath: sourceRelPath,
    sourceHash,
    modelId: cfg.modelId,
  };

  const fixtureDir =
    opts.fixtureDir ?? process.env.ZOTO_EVAL_ANALYSER_FIXTURE_DIR;
  if (fixtureDir && fixtureDir.trim().length > 0) {
    const payload = readFixturePayload(fixtureDir.trim(), sourceHash);
    const validator = await getPayloadValidator(repoRoot);
    if (!validator.validate(payload)) {
      throw new AnalyserError(
        `analyser fixture failed schema validation: ${JSON.stringify(validator.errors())}`,
        "fixture_invalid",
      );
    }
    assertPayloadConsistency(payload, expected);
    assertPayloadJustifications(payload);
    budget.replayHits += 1;
    return {
      payload,
      cacheHit: false,
      replayHit: true,
      fromDiskCache: false,
      source: "replay",
    };
  }

  const cacheDir = opts.cacheDir ?? join(repoRoot, ANALYSER_CACHE_REL);
  if (!opts.invalidate) {
    const cached = readDiskCache(cacheDir, sourceHash);
    if (cached) {
      const validator = await getPayloadValidator(repoRoot);
      if (!validator.validate(cached)) {
        process.stderr.write(
          `${JSON.stringify({
            warn: "cached_payload_invalid_regenerating",
            cache_file: join(cacheDir, `${sourceHash}.json`),
            errors: validator.errors(),
          })}\n`,
        );
      } else {
        try {
          assertPayloadConsistency(cached, expected);
          assertPayloadJustifications(cached);
          budget.callsCached += 1;
          return {
            payload: cached,
            cacheHit: true,
            replayHit: false,
            fromDiskCache: true,
            source: "cache",
          };
        } catch {
          /* fall through and regenerate */
        }
      }
    }
  }

  if (budget.callsMade >= cfg.maxCallsPerInvocation) {
    throw new AnalyserError(
      `analyser call budget exhausted (maxCallsPerInvocation=${cfg.maxCallsPerInvocation}); use --target to scope work or raise analyser.maxCallsPerInvocation in .zoto/eval-system/config.yml`,
      "budget_exhausted",
    );
  }

  const sdk = opts.sdk ?? (await defaultSdkFactory());
  const systemPrompt = loadSubagentPrompt(repoRoot);
  const { fm, body } = readFrontmatter(raw);
  const prompt = buildAnalyserPrompt({
    systemPrompt,
    resolved,
    sourceText: raw,
    frontmatter: fm,
    body,
    modelId: cfg.modelId,
    sourceHash,
  });

  const responseRaw = await callSdk(sdk, prompt, cfg.modelId, repoRoot);
  budget.callsMade += 1;
  budget.totalTokensEstimate += estimateTokens(prompt) + estimateTokens(responseRaw);

  let parsed: AnalyserPayload;
  try {
    parsed = JSON.parse(extractJsonObject(responseRaw)) as AnalyserPayload;
  } catch (e) {
    throw new AnalyserError(
      `analyser response was not parseable JSON: ${(e as Error).message}; first 200 chars: ${responseRaw.slice(0, 200)}`,
      "response_not_json",
    );
  }

  // Force-pin canonical fields the analyser is required to mirror.
  parsed.schema_version = 1;
  parsed.analyser_version = ANALYSER_VERSION;
  parsed.model_id = cfg.modelId;
  parsed.target_id = resolved.targetId;
  parsed.kind = resolved.kind as PrimitiveKind;
  parsed.source_path = sourceRelPath;
  parsed.source_hash = sourceHash;

  const validator = await getPayloadValidator(repoRoot);
  if (!validator.validate(parsed)) {
    throw new AnalyserError(
      `analyser response failed schema validation: ${JSON.stringify(validator.errors())}`,
      "response_invalid",
    );
  }
  assertPayloadJustifications(parsed);

  if (!opts.ephemeralCache) {
    try {
      writeDiskCache(cacheDir, sourceHash, parsed);
    } catch (e) {
      process.stderr.write(
        `${JSON.stringify({
          warn: "analyser_cache_write_failed",
          message: (e as Error).message,
        })}\n`,
      );
    }
  }

  return {
    payload: parsed,
    cacheHit: false,
    replayHit: false,
    fromDiskCache: false,
    source: "fresh",
  };
}

interface CliArgs {
  target: string;
  pretty: boolean;
  legacy: boolean;
  outPath: string | null;
  maxCalls: number | null;
  concurrency: number | null;
}

function parseAnalyserArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    target: "",
    pretty: false,
    legacy: false,
    outPath: null,
    maxCalls: null,
    concurrency: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--pretty") out.pretty = true;
    else if (a === "--legacy") out.legacy = true;
    else if (a === "--target" && argv[i + 1]) out.target = argv[++i]!;
    else if (a === "--out" && argv[i + 1]) out.outPath = argv[++i]!;
    else if (a === "--max-calls" && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 1) out.maxCalls = Math.floor(n);
    } else if (a === "--concurrency" && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 1) out.concurrency = Math.floor(n);
    } else if (!a.startsWith("-") && !out.target) out.target = a;
  }
  return out;
}

async function mainAsync(argv: string[]): Promise<number> {
  const args = parseAnalyserArgs(argv);
  if (!args.target) {
    process.stderr.write(
      `${JSON.stringify({
        error: "usage",
        message:
          "tsx scripts/eval-analyse.ts --target <path-or-target-id> [--pretty] [--out <file>] [--max-calls <n>] [--concurrency <n>] [--legacy]",
      })}\n`,
    );
    return 1;
  }

  if (args.legacy) {
    const out = analyse(args.target);
    if ("error" in out) {
      process.stderr.write(`${JSON.stringify(out)}\n`);
      return 1;
    }
    const txt = JSON.stringify(out, null, args.pretty ? 2 : undefined);
    if (args.outPath) writeFileSync(resolve(REPO_ROOT, args.outPath), `${txt}\n`, "utf-8");
    else process.stdout.write(`${txt}\n`);
    return 0;
  }

  const cfg = loadAnalyserConfig();
  const overrides: Partial<AnalyserConfig> = {};
  if (args.maxCalls !== null) overrides.maxCallsPerInvocation = args.maxCalls;
  if (args.concurrency !== null) overrides.concurrency = args.concurrency;
  void cfg.concurrency;

  const budget = newAnalyserBudget();
  try {
    const result = await runAnalyser(
      { target: args.target },
      { config: overrides, budget },
    );
    const payloadTxt = JSON.stringify(
      result.payload,
      null,
      args.pretty ? 2 : undefined,
    );
    if (args.outPath) {
      mkdirSync(dirname(resolve(REPO_ROOT, args.outPath)), { recursive: true });
      writeFileSync(resolve(REPO_ROOT, args.outPath), `${payloadTxt}\n`, "utf-8");
    } else {
      process.stdout.write(`${payloadTxt}\n`);
    }
    process.stderr.write(
      `${JSON.stringify({
        analyser: {
          target_id: result.payload.target_id,
          source: result.source,
          source_hash: result.payload.source_hash,
        },
      })}\n`,
    );
    return 0;
  } catch (e) {
    if (e instanceof AnalyserError) {
      process.stderr.write(
        `${JSON.stringify({ error: e.code, message: e.message })}\n`,
      );
      return e.code === "budget_exhausted" ? 3 : 2;
    }
    process.stderr.write(
      `${JSON.stringify({ error: "unhandled", message: (e as Error).message })}\n`,
    );
    return 2;
  } finally {
    emitCostSummary(budget);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mainAsync(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`fatal: ${(err as Error).message}\n`);
      process.exit(1);
    },
  );
}
