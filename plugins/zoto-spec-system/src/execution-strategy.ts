import { Ajv, type ErrorObject } from "ajv";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "..", "templates", "schema", "execution-strategy.schema.json");

/** The two execution strategies a spec can declare. A missing block means `phased`. */
export type ExecutionStrategyName = "phased" | "loop";
export type CheckKind = "review" | "static" | "test" | "jev" | "agent_eval";

export interface LoopCheck {
  id: string;
  covers: string[];
  kind: CheckKind;
  description?: string;
  run?: string;
  question?: string;
  threshold?: number;
  eval?: string;
}

export interface LoopLimits {
  max_loops: number;
  max_duration_minutes: number;
  max_cost_usd?: number;
  max_tokens?: number;
  swarm_size: number;
  batch_size: number;
  max_stalled_loops: number;
  checks: LoopCheck[];
}

export interface EvalsConfig {
  provider: "jev" | "local";
  guard_inputs: boolean;
  score_checks: boolean;
  threshold: number;
  model?: string;
}

export interface AgentSdkConfig {
  package: "@grok/agent-sdk";
  version?: string;
  project: string;
  eval_tag?: string;
}

export interface ExecutionStrategy {
  execution_strategy: ExecutionStrategyName;
  loop?: LoopLimits;
  evals?: EvalsConfig;
  agent_sdk?: AgentSdkConfig;
}

export type StrategySeverity = "HIGH" | "MEDIUM" | "LOW";

export interface StrategyFinding {
  rule: string;
  severity: StrategySeverity;
  finding: string;
  recommendation: string;
}

export interface ParseResult {
  /** Normalized strategy. `phased` when the block is missing. */
  strategy: ExecutionStrategy;
  /** True when the spec index contains an `## Execution Strategy` block. */
  declared: boolean;
  /** Schema or YAML errors; non-empty means `strategy` fell back to the parsed or default value. */
  errors: StrategyFinding[];
}

/** Criteria ids that loop checks may reference. */
export interface CriteriaRefs {
  requirements: number;
  definitionOfDone: number;
  subtasks: Record<string, { deliverables: number; definitionOfDone: number }>;
}

export const DEFAULT_STRATEGY: ExecutionStrategy = { execution_strategy: "phased" };

const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: true });
const validate = ajv.compile(JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as object);

const HEADING_RE = /^##\s+Execution Strategy\s*$/im;
const FENCE_RE = /```ya?ml\s*\n([\s\S]*?)\n```/;

/** Returns the YAML text of the `## Execution Strategy` block, or undefined when the spec has none. */
export function extractExecutionBlock(indexMd: string): string | undefined {
  const heading = HEADING_RE.exec(indexMd);
  if (!heading) return undefined;
  const rest = indexMd.slice(heading.index + heading[0].length);
  const next = rest.search(/^##\s+/m);
  const section = next === -1 ? rest : rest.slice(0, next);
  return FENCE_RE.exec(section)?.[1];
}

function schemaFindings(errors: ErrorObject[] | null | undefined): StrategyFinding[] {
  return (errors ?? [])
    .filter((e) => e.keyword !== "if" && e.keyword !== "anyOf")
    .map((e) => ({
      rule: "ES000",
      severity: "HIGH" as const,
      finding: `Execution strategy ${e.instancePath || "(root)"} ${e.message ?? "is invalid"}${e.keyword === "additionalProperties" ? ` (${String((e.params as { additionalProperty?: string }).additionalProperty)})` : ""}`,
      recommendation: "Fix the block to match templates/schema/execution-strategy.schema.json",
    }));
}

/** Applies schema defaults and the `evals: jev` shorthand. Never throws. */
export function normalizeExecutionStrategy(raw: unknown): { strategy: ExecutionStrategy; errors: StrategyFinding[] } {
  if (raw === undefined) return { strategy: { ...DEFAULT_STRATEGY }, errors: [] };
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      strategy: { ...DEFAULT_STRATEGY },
      errors: [{ rule: "ES000", severity: "HIGH", finding: "Execution strategy block is not a YAML mapping", recommendation: "Write `execution_strategy: phased` or `execution_strategy: loop` with a `loop:` mapping" }],
    };
  }
  const copy = structuredClone(raw) as Record<string, unknown>;
  if (typeof copy.evals === "string") copy.evals = { provider: copy.evals };
  if (copy.execution_strategy === undefined) copy.execution_strategy = "phased";
  const ok = validate(copy);
  const errors = ok ? [] : schemaFindings(validate.errors);
  const strategy = copy as unknown as ExecutionStrategy;
  // ajv does not apply defaults inside oneOf branches.
  if (strategy.evals && typeof strategy.evals === "object") {
    strategy.evals = { guard_inputs: true, score_checks: true, threshold: 0.85, ...strategy.evals };
  }
  if (strategy.agent_sdk && typeof strategy.agent_sdk === "object") {
    strategy.agent_sdk = { package: "@grok/agent-sdk", ...strategy.agent_sdk };
  }
  if (strategy.execution_strategy !== "phased" && strategy.execution_strategy !== "loop") strategy.execution_strategy = "phased";
  return { strategy, errors };
}

/** Parses and normalizes the strategy block of a spec index. */
export function parseExecutionStrategy(indexMd: string): ParseResult {
  const block = extractExecutionBlock(indexMd);
  if (block === undefined) {
    const declared = HEADING_RE.test(indexMd);
    return { strategy: { ...DEFAULT_STRATEGY }, declared, errors: declared ? [{ rule: "ES000", severity: "HIGH", finding: "Execution Strategy section has no YAML fence", recommendation: "Add a fenced yaml mapping, or remove the empty heading" }] : [] };
  }
  let raw: unknown;
  try {
    raw = YAML.parse(block);
  } catch (e) {
    return {
      strategy: { ...DEFAULT_STRATEGY },
      declared: true,
      errors: [{ rule: "ES000", severity: "HIGH", finding: `Execution strategy YAML does not parse: ${(e as Error).message.split("\n")[0]}`, recommendation: "Fix the YAML in the `## Execution Strategy` fence" }],
    };
  }
  return { ...normalizeExecutionStrategy(raw), declared: true };
}

function sectionBody(md: string, heading: RegExp): string {
  const m = heading.exec(md);
  if (!m) return "";
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

const countNumbered = (body: string) => (body.match(/^\s*\d+\.\s+\S/gm) ?? []).length;
const countChecklist = (body: string) => (body.match(/^\s*-\s+\[[ xX]\]\s+\S/gm) ?? []).length;

/** Reads the criteria a loop check may cover from the spec index and its subtask files. */
export function criteriaRefsFromMarkdown(indexMd: string, subtaskFiles: Record<string, string>): CriteriaRefs {
  const subtasks: CriteriaRefs["subtasks"] = {};
  for (const [name, body] of Object.entries(subtaskFiles)) {
    const id = /^subtask-(\d{2})-/.exec(name)?.[1];
    if (!id) continue;
    subtasks[id] = {
      deliverables: countChecklist(sectionBody(body, /^##\s+Deliverables Checklist\s*$/im)),
      definitionOfDone: countChecklist(sectionBody(body, /^##\s+Definition of Done\s*$/im)),
    };
  }
  return {
    requirements: countNumbered(sectionBody(indexMd, /^##\s+Requirements\s*$/im)),
    definitionOfDone: countChecklist(sectionBody(indexMd, /^##\s+Definition of Done\s*$/im)),
    subtasks,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Whether `ref` names a criterion that exists in the spec. */
export function refExists(ref: string, refs: CriteriaRefs): boolean {
  let m = /^R(\d{2})$/.exec(ref);
  if (m) return Number(m[1]) >= 1 && Number(m[1]) <= refs.requirements;
  m = /^DoD(\d{2})$/.exec(ref);
  if (m) return Number(m[1]) >= 1 && Number(m[1]) <= refs.definitionOfDone;
  m = /^(\d{2})$/.exec(ref);
  if (m) return m[1] in refs.subtasks;
  m = /^(\d{2})\.(D|DoD)(\d{2})$/.exec(ref);
  if (m) {
    const s = refs.subtasks[m[1]];
    const n = Number(m[3]);
    return Boolean(s) && n >= 1 && n <= (m[2] === "D" ? s.deliverables : s.definitionOfDone);
  }
  return false;
}

export interface LintOptions {
  /** `spec.parallelLimit` from config; swarm sizes above it are flagged. */
  parallelLimit?: number;
}

/**
 * Semantic rules the schema cannot express. Rule ids are stable so hosts can
 * map them: ES001 loop without limits, ES002 no spend limit, ES003 no checks,
 * ES004 unknown criterion, ES005 requirement not covered, ES006 subtask
 * Definition of Done not covered, ES007 provider missing for a check kind,
 * ES008 swarm above parallel limit, ES009 duplicate check id, ES010 loop
 * settings on a phased spec, ES011 Agent SDK project without a version pin,
 * ES012 spec DoD not covered, ES013 unsafe project path.
 */
export function lintExecutionStrategy(strategy: ExecutionStrategy, refs: CriteriaRefs, opts: LintOptions = {}): StrategyFinding[] {
  const out: StrategyFinding[] = [];
  const loop = strategy.loop;
  if (strategy.execution_strategy === "phased") {
    if (loop) out.push({ rule: "ES010", severity: "LOW", finding: "`loop` settings are ignored because the strategy is phased", recommendation: "Remove `loop:` or set `execution_strategy: loop`" });
  } else if (!loop) {
    out.push({ rule: "ES001", severity: "HIGH", finding: "Loop strategy has no `loop` limits", recommendation: "Set max_loops, max_duration_minutes, max_cost_usd or max_tokens, and checks" });
  } else {
    if (!loop.max_loops || !loop.max_duration_minutes) {
      out.push({ rule: "ES001", severity: "HIGH", finding: "Loop strategy needs both max_loops and max_duration_minutes", recommendation: "Bound the loop by iterations and wall-clock time" });
    }
    if (loop.max_cost_usd === undefined && loop.max_tokens === undefined) {
      out.push({ rule: "ES002", severity: "HIGH", finding: "Loop strategy has no spend limit", recommendation: "Set max_cost_usd, max_tokens, or both" });
    }
    const checks = loop.checks ?? [];
    if (checks.length === 0) out.push({ rule: "ES003", severity: "HIGH", finding: "Loop strategy has no checks, so it can never confirm the spec is met", recommendation: "Add checks whose `covers` map to the requirements and Definition of Done" });
    const seen = new Set<string>();
    const covered = new Set<string>();
    for (const c of checks) {
      if (seen.has(c.id)) out.push({ rule: "ES009", severity: "HIGH", finding: `Duplicate check id ${c.id}`, recommendation: "Give each check a unique id, C01, C02, …" });
      seen.add(c.id);
      for (const ref of c.covers ?? []) {
        if (!refExists(ref, refs)) out.push({ rule: "ES004", severity: "HIGH", finding: `Check ${c.id} covers ${ref}, which is not in the spec`, recommendation: "Reference an existing requirement (R01), spec DoD item (DoD01), subtask (02) or subtask item (02.D01, 02.DoD01)" });
        else covered.add(ref);
      }
      if (c.kind === "jev" && (strategy.evals?.provider !== "jev" || strategy.evals?.score_checks === false)) {
        out.push({ rule: "ES007", severity: "HIGH", finding: `Check ${c.id} is a jev check but Jev scoring is not enabled`, recommendation: "Set `evals: jev` with score_checks enabled, or change the check kind" });
      }
      if (c.kind === "agent_eval" && !strategy.agent_sdk) {
        out.push({ rule: "ES007", severity: "HIGH", finding: `Check ${c.id} is an agent_eval check but no agent_sdk project is declared`, recommendation: "Add `agent_sdk: { project, version }`, or change the check kind" });
      }
    }
    for (let i = 1; i <= refs.requirements; i++) {
      if (!covered.has(`R${pad(i)}`)) out.push({ rule: "ES005", severity: "HIGH", finding: `Requirement R${pad(i)} is not covered by any check`, recommendation: "The loop exits when every check passes; add a check that proves this requirement" });
    }
    for (let i = 1; i <= refs.definitionOfDone; i++) {
      if (!covered.has(`DoD${pad(i)}`)) out.push({ rule: "ES012", severity: "MEDIUM", finding: `Spec Definition of Done item DoD${pad(i)} is not covered by any check`, recommendation: "Add a check that proves this spec-level completion criterion" });
    }
    for (const [id, s] of Object.entries(refs.subtasks)) {
      if (covered.has(id)) continue;
      for (let i = 1; i <= s.definitionOfDone; i++) {
        if (!covered.has(`${id}.DoD${pad(i)}`)) out.push({ rule: "ES006", severity: "MEDIUM", finding: `Subtask ${id} Definition of Done item ${pad(i)} is not covered by any check`, recommendation: `Cover ${id} or ${id}.DoD${pad(i)} with a check` });
      }
    }
    if (opts.parallelLimit !== undefined && (loop.swarm_size ?? 1) > opts.parallelLimit) {
      out.push({ rule: "ES008", severity: "MEDIUM", finding: `swarm_size ${loop.swarm_size} is above spec.parallelLimit ${opts.parallelLimit}`, recommendation: "The executor caps the swarm at spec.parallelLimit; lower swarm_size" });
    }
  }
  if (strategy.agent_sdk && (/^(?:[\\/]|[A-Za-z]:)/.test(strategy.agent_sdk.project) || strategy.agent_sdk.project.split(/[\\/]/).includes(".."))) {
    out.push({ rule: "ES013", severity: "HIGH", finding: "agent_sdk.project must stay within the repository", recommendation: "Use a repo-relative path without .. segments; hosts must also reject symlinks outside the repo" });
  }
  if (strategy.agent_sdk && !strategy.agent_sdk.version) {
    out.push({ rule: "ES011", severity: "LOW", finding: "agent_sdk has no version pin", recommendation: "Pin the @grok/agent-sdk version the project was validated with" });
  }
  return out;
}

/** Parses, validates and lints the strategy of one spec directory. */
export function checkSpecExecutionStrategy(specDir: string, opts: LintOptions = {}): ParseResult & { findings: StrategyFinding[] } {
  const names = existsSync(specDir) ? readdirSync(specDir) : [];
  const index = names.find((n) => n.startsWith("spec-") && n.endsWith(".md"));
  if (!index) {
    const errors: StrategyFinding[] = [{ rule: "ES000", severity: "HIGH", finding: `No spec-*.md index in ${specDir}`, recommendation: "Point at a spec directory" }];
    return { strategy: { ...DEFAULT_STRATEGY }, declared: false, errors, findings: errors };
  }
  const indexMd = readFileSync(join(specDir, index), "utf-8");
  const subtaskFiles = Object.fromEntries(names.filter((n) => /^subtask-\d{2}-.*\.md$/.test(n)).map((n) => [n, readFileSync(join(specDir, n), "utf-8")]));
  const parsed = parseExecutionStrategy(indexMd);
  const findings = lintExecutionStrategy(parsed.strategy, criteriaRefsFromMarkdown(indexMd, subtaskFiles), opts);
  return { ...parsed, findings: [...parsed.errors, ...findings] };
}
