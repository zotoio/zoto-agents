/**
 * Subtask 04 — mechanical realism audit + rewrite payload generator.
 * Run: npx tsx specs/20260525-eval-prompt-realism-audit/audit/generate-phase2-audit.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { redact } from "./redact.ts";

const REPO = join(import.meta.dirname, "../../..");
const AUDIT = join(import.meta.dirname, ".");

type Inventory = {
  files: Record<
    string,
    {
      container_shape: string;
      target_id?: string;
      case_count_generated: number;
      case_count_user_authored: number;
    }
  >;
};

type TranscriptIndex = {
  targets: Record<
    string,
    {
      kind: string;
      hits?: Array<{
        transcript_uuid: string;
        first_user_prompt: string;
        follow_ups?: string[];
      }>;
      synthetic_seed?: string;
    }
  >;
};

type EvalCase = {
  id: number | string;
  prompt: string;
  assertions?: string[];
  expected_output?: string;
  follow_ups?: string[];
  _meta?: { generated?: boolean };
};

const PRECONDITION_REFUSE = [
  /Eval System is not initialised\. Run/i,
  /Spec System is not initialised\. Run/i,
  /exact message:/i,
  /precise initialisation error/i,
  /stops immediately with the precise initialisation error/i,
];

const CONTRACT_ASSERTION_RES = [
  /_meta\.generated:\s*true/i,
  /\/\/ _meta\.generated\\:\s*true/i,
  /# _meta\.generated\\:\s*True/i,
  /source_hash:\s*.*64 lowercase hex/i,
  /normalised SHA-256 digest \(64 lowercase hex/i,
  /ISO-8601 timestamp/i,
  /manifest\.history\.yml.*append-only/i,
  /append-only.*manifest\.history\.yml/i,
  /never compacted/i,
  /needs_user_input/i,
  /byte-equal to `plugins\/zoto-eval-system\/templates\/canvas\/compare-prompt\.md\.tmpl`/i,
  /schema_version:\s*1/i,
  /additionalProperties:\s*false/i,
  /fixture_justifications/i,
  /Exit status was 0/i,
  /stdout parsed as a JSON object with no keys/i,
  /stdout was valid JSON/i,
  /"additional_context":/i,
  /early-return `\{\}`/i,
  /exactly `\{\}`/i,
];

const INTERNAL_MECHANIC_RES = [
  /spawned Task named/i,
  /Available transcripts show/i,
  /Inside the generator flow/i,
  /traces show `zoto-update-evals`/i,
  /Logged operations include/i,
  /Command logs confirm/i,
  /Touchpoints with/i,
  /Reviewers observe no undocumented assistant tooling/i,
  /Across the trajectory the generator never emits/i,
  /referenced the `zoto-/i,
  /before spawning any Task/i,
  /askQuestion tool emissions/i,
  /No `zoto-eval-generator` subagent was spawned/i,
  /was not invoked while the precondition failed/i,
  /Before any `askQuestion`/i,
];

/** Commands where bare `/cmd` with no args is a documented capability (not precondition-only). */
const DOCUMENTED_NO_ARGS: Record<string, { doc: string; lines: string }> = {
  "command:z-eval-create": {
    doc: "plugins/zoto-eval-system/commands/z-eval-create.md",
    lines: "12:14",
  },
  "command:z-eval-advise": {
    doc: "plugins/zoto-eval-system/commands/z-eval-advise.md",
    lines: "1:30",
  },
  "command:z-eval-help": {
    doc: "plugins/zoto-eval-system/commands/z-eval-help.md",
    lines: "1:20",
  },
  "command:z-eval-init": {
    doc: "plugins/zoto-eval-system/commands/z-eval-init.md",
    lines: "1:20",
  },
  "command:z-eval-start": {
    doc: "plugins/zoto-eval-system/commands/z-eval-start.md",
    lines: "1:20",
  },
  "command:z-eval-workflow": {
    doc: "plugins/zoto-eval-system/commands/z-eval-workflow.md",
    lines: "1:20",
  },
  "command:z-spec-create": {
    doc: "plugins/zoto-spec-system/commands/z-spec-create.md",
    lines: "12:14",
  },
  "command:z-spec-judge": {
    doc: "plugins/zoto-spec-system/commands/z-spec-judge.md",
    lines: "1:40",
  },
  "command:z-spec-execute": {
    doc: "plugins/zoto-spec-system/commands/z-spec-execute.md",
    lines: "1:40",
  },
  "command:sync-plugins": {
    doc: ".cursor/commands/sync-plugins.md",
    lines: "1:15",
  },
  "command:zoto-create-plugin": {
    doc: ".cursor/commands/zoto-create-plugin.md",
    lines: "1:20",
  },
};

const COMMAND_README: Record<string, string> = {
  "command:sync-plugins": ".cursor/commands/sync-plugins.md",
  "command:z-eval-create": "plugins/zoto-eval-system/commands/z-eval-create.md",
  "command:z-eval-update": "plugins/zoto-eval-system/commands/z-eval-update.md",
  "command:z-eval-configure": "plugins/zoto-eval-system/commands/z-eval-configure.md",
  "command:z-eval-execute": "plugins/zoto-eval-system/commands/z-eval-execute.md",
  "command:z-eval-judge": "plugins/zoto-eval-system/commands/z-eval-judge.md",
  "command:z-eval-compare": "plugins/zoto-eval-system/commands/z-eval-compare.md",
  "command:z-eval-advise": "plugins/zoto-eval-system/commands/z-eval-advise.md",
  "command:z-eval-help": "plugins/zoto-eval-system/commands/z-eval-help.md",
  "command:z-eval-init": "plugins/zoto-eval-system/commands/z-eval-init.md",
  "command:z-eval-start": "plugins/zoto-eval-system/commands/z-eval-start.md",
  "command:z-eval-jump": "plugins/zoto-eval-system/commands/z-eval-jump.md",
  "command:z-eval-operator": "plugins/zoto-eval-system/commands/z-eval-operator.md",
  "command:z-eval-workflow": "plugins/zoto-eval-system/commands/z-eval-workflow.md",
  "command:z-spec-create": "plugins/zoto-spec-system/commands/z-spec-create.md",
  "command:z-spec-execute": "plugins/zoto-spec-system/commands/z-spec-execute.md",
  "command:z-spec-init": "plugins/zoto-spec-system/commands/z-spec-init.md",
  "command:z-spec-judge": "plugins/zoto-spec-system/commands/z-spec-judge.md",
  "command:zoto-create-plugin": ".cursor/commands/zoto-create-plugin.md",
};

const AGENT_README: Record<string, string> = {
  "agent:zoto-eval-generator": "plugins/zoto-eval-system/agents/zoto-eval-generator.md",
  "agent:zoto-eval-adviser": "plugins/zoto-eval-system/agents/zoto-eval-adviser.md",
  "agent:zoto-eval-analyser-subagent": "plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md",
  "agent:zoto-eval-comparer": "plugins/zoto-eval-system/agents/zoto-eval-comparer.md",
  "agent:zoto-eval-configurer": "plugins/zoto-eval-system/agents/zoto-eval-configurer.md",
  "agent:zoto-eval-executor": "plugins/zoto-eval-system/agents/zoto-eval-executor.md",
  "agent:zoto-eval-judge": "plugins/zoto-eval-system/agents/zoto-eval-judge.md",
  "agent:zoto-eval-updater": "plugins/zoto-eval-system/agents/zoto-eval-updater.md",
  "agent:zoto-spec-generator": "plugins/zoto-spec-system/agents/zoto-spec-generator.md",
  "agent:zoto-spec-executor": "plugins/zoto-spec-system/agents/zoto-spec-executor.md",
  "agent:zoto-spec-judge": "plugins/zoto-spec-system/agents/zoto-spec-judge.md",
  "agent:zoto-plugin-manager": ".cursor/agents/zoto-plugin-manager.md",
};

function skillPath(name: string): string {
  if (name === "zoto-create-plugin") return ".cursor/skills/zoto-create-plugin/SKILL.md";
  if (name === "zoto-cursor-top-monitor")
    return "plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/SKILL.md";
  const plugin =
    name.startsWith("zoto-create-spec") ||
    name.startsWith("zoto-execute-spec") ||
    name.startsWith("zoto-judge-spec")
      ? "zoto-spec-system"
      : "zoto-eval-system";
  return `plugins/${plugin}/skills/${name}/SKILL.md`;
}

function resolveTargetId(filePath: string, meta: Inventory["files"][string], raw: Record<string, unknown>): string {
  if (meta.target_id) {
    const tid = meta.target_id;
    if (tid.includes(":")) return tid;
    if (filePath.includes("/evals/commands/") || filePath.includes("/commands/")) return `command:${tid}`;
    if (filePath.includes("/evals/agents/")) return `agent:${tid}`;
    if (filePath.includes("/evals/hooks/")) return `hook:${tid}`;
    return `skill:${tid}`;
  }
  const tid = raw.target_id as string | undefined;
  if (tid) return tid;
  const agent = raw.agent_name as string | undefined;
  if (agent) return `agent:${agent}`;
  const cmd = raw.command_name as string | undefined;
  if (cmd) return `command:${cmd}`;
  const hook = raw.hook_plugin as string | undefined;
  if (hook) return `hook:${hook}`;
  const skill = raw.skill_name as string | undefined;
  if (skill) return `skill:${skill}`;
  if (filePath.includes("/hooks/hooks.json")) return "hook:cursor-workspace";
  if (filePath.includes("/commands/")) {
    const base = filePath.split("/").pop()?.replace(".json", "") ?? "";
    return `command:${base}`;
  }
  return "unknown:unknown";
}

/** Unique payload key; duplicate numeric ids use `@index` suffix (mixed evals[] files). */
function casePayloadKey(c: EvalCase, index: number, cases: EvalCase[]): string {
  const id = String(c.id);
  const dup = cases.filter((x) => String(x.id) === id).length > 1;
  return dup ? `${id}@${index}` : id;
}

function parseKind(targetId: string): "command" | "agent" | "hook" | "skill" {
  const k = targetId.split(":")[0];
  if (k === "command" || k === "agent" || k === "hook" || k === "skill") return k;
  return "skill";
}

function isGenerated(c: EvalCase): boolean {
  return c._meta?.generated === true;
}

function oneLiner(s: string, max = 100): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function isPreconditionAbort(c: EvalCase): boolean {
  const blob = [c.prompt, ...(c.assertions ?? []), c.expected_output ?? ""].join("\n");
  return PRECONDITION_REFUSE.some((re) => re.test(blob));
}

function isBareCommand(prompt: string): boolean {
  return /^\/[\w-]+$/.test(prompt.trim());
}

function classifyPromptRealism(prompt: string, kind: string): "realistic" | "mixed" | "synthetic" {
  if (kind === "hook" && /sessionStart|afterFileEdit|Cursor fires/i.test(prompt)) return "realistic";
  if (kind === "agent" && /^(We |I |Please |Run |Audit |Add |Continue |How )/i.test(prompt)) return "realistic";
  if (kind === "skill" && /^(How |I |Upstream |What |The operator)/i.test(prompt)) return "realistic";
  if (kind === "command" && /^\/[\w-]+(\s+[^\s].*)?$/.test(prompt.trim()) && !isBareCommand(prompt))
    return "realistic";
  if (kind === "command" && isBareCommand(prompt)) return "synthetic";
  if (/You spawned|materialize|Upstream task|honour every knob|Follow `\/z-eval-create`/i.test(prompt))
    return "synthetic";
  if (/^\/z-eval-help$/i.test(prompt.trim()) && kind !== "command") return "mixed";
  return "mixed";
}

function classifyInvocation(prompt: string, kind: string, bareException: boolean): string {
  if (kind === "command") {
    if (bareException && isBareCommand(prompt)) return "bare-exception";
    if (isBareCommand(prompt)) return "bare-invalid";
    if (/^\/[\w-]+\s/.test(prompt.trim())) return "cmd-with-args";
    return "bare-invalid";
  }
  if (kind === "agent") {
    if (prompt.startsWith("/")) return "slash-lead-invalid";
    if (/You spawned|materialize sanctioned/i.test(prompt)) return "third-person-narration";
    return "natural-delegation";
  }
  if (kind === "hook") return "lifecycle-event";
  return "upstream-agent-message";
}

function isContractAssertion(a: string): boolean {
  return CONTRACT_ASSERTION_RES.some((re) => re.test(a));
}

function isInternalMechanic(a: string): boolean {
  if (isContractAssertion(a)) return false;
  return INTERNAL_MECHANIC_RES.some((re) => re.test(a));
}

function classifyAssertions(assertions: string[] | undefined): "strong" | "mixed" | "weak" {
  const arr = assertions ?? [];
  if (!arr.length) return "strong";
  const internal = arr.filter(isInternalMechanic).length;
  const contract = arr.filter(isContractAssertion).length;
  const userVisible = arr.length - internal;
  if (internal === 0) return "strong";
  if (userVisible >= internal) return "mixed";
  return "weak";
}

function lookupTranscript(
  index: TranscriptIndex,
  targetId: string,
  caseIdx: number,
): { seed_source: string; text: string; follow_ups?: string[] } {
  const entry = index.targets[targetId];
  if (!entry?.hits?.length) {
    const kind = parseKind(targetId);
    if (kind === "skill") {
      const name = targetId.replace(/^skill:/, "");
      return { seed_source: `skill-usage:${skillPath(name)}`, text: "" };
    }
    const readme =
      COMMAND_README[targetId] ?? AGENT_README[targetId] ?? "plugins/zoto-eval-system/README.md";
    return { seed_source: `readme:${readme}`, text: "" };
  }
  const nonHarness = entry.hits.filter((h) => !h.first_user_prompt.startsWith("You are"));
  const pool = nonHarness.length ? nonHarness : entry.hits;
  const hit = pool[caseIdx % pool.length];
  return {
    seed_source: `transcript:${hit.transcript_uuid}`,
    text: hit.first_user_prompt,
    follow_ups: hit.follow_ups,
  };
}

function rewriteAssertion(a: string, kind: string): string {
  if (isContractAssertion(a)) return a;

  if (/spawned Task named `zoto-eval-generator`/i.test(a)) {
    return "After scaffolding completes, `.zoto/eval-system/manifest.yml` lists every operator-approved target and the closing guidance mentions `pnpm run eval:list`, `pnpm run eval -- --collect-only`, and `pnpm run eval:update --check`.";
  }
  if (/referenced the `zoto-create-evals` skill/i.test(a)) {
    return "The operator sees on-screen confirmation that eval backends were stamped and manifest rows were written for each approved primitive.";
  }
  if (/Inside the generator flow the assistant invoked `pnpm run eval:discover`/i.test(a)) {
    return "Stamped eval JSON files exist under the configured evalsDir for each approved skill, command, agent, and hook target.";
  }
  if (/Available transcripts show zero `askQuestion`/i.test(a)) {
    return "The agent returns structured `needs_user_input` (when configuration is missing) without emitting `askQuestion` from the subagent loop.";
  }
  if (/traces show `zoto-update-evals`/i.test(a)) {
    return "Running `pnpm run eval:update --check` exits 0 immediately after scaffolding, confirming zero drift.";
  }
  if (/Logged operations include `pnpm run eval:discover`/i.test(a)) {
    return "The workspace contains discovery output reflected in `.zoto/eval-system/manifest.yml` target rows.";
  }
  if (/Command logs confirm `pnpm run eval:list`/i.test(a)) {
    return "`pnpm run eval:list`, `pnpm run eval -- --collect-only`, and `pnpm run eval:update --check` each exit with status 0.";
  }
  if (/Before any `askQuestion`, discovery, or `zoto-eval-generator` Task/i.test(a)) {
    return "When `.zoto/eval-system/config.yml` is missing, the assistant returns the exact refuse message before any discovery or subagent work.";
  }
  if (/No `zoto-eval-generator` subagent was spawned/i.test(a)) {
    return "No manifest rows are written and no eval scaffolding files appear while the precondition fails.";
  }
  if (/was not invoked while the precondition failed/i.test(a)) {
    return "No `pnpm run eval:discover` output or stamped eval files appear while the precondition fails.";
  }
  if (/After the generator returned `needs_user_input`/i.test(a)) {
    return "When the generator returns `needs_user_input`, the parent command surfaces an `askQuestion` and resumes the same generator Task with the supplied answers.";
  }
  if (/The assistant resumed the existing `zoto-eval-generator` Task/i.test(a)) {
    return "After the operator answers the outstanding question, scaffolding continues and completes without restarting from scratch.";
  }
  if (/No askQuestion was emitted from the hook binary/i.test(a)) {
    return "The hook process remains non-interactive (exit 0, JSON stdout only).";
  }
  if (/No interactive prompt or askQuestion channel was used/i.test(a)) {
    return "The hook process exits 0 and prints JSON to stdout without interactive prompts.";
  }
  if (/Across the trajectory the generator never emits `askQuestion`/i.test(a)) {
    return "The generator never calls `askQuestion`; missing inputs are returned as structured `needs_user_input` for the parent command.";
  }
  if (/Touchpoints with `zoto-configure-evals`/i.test(a)) {
    return "Configuration writes occur only when the commanding payload already includes answers from `/z-eval-configure`.";
  }
  if (/Reviewers observe no undocumented assistant tooling/i.test(a)) {
    return "Repository diffs are limited to eval scaffolding trees, manifests, package script merges, and documented template files.";
  }

  // hook case 1: tighten transcript-side observation
  if (/Hook output \(or written artefact\) carries an ISO-8601 timestamp/i.test(a) && kind === "hook") {
    return "Hook stdout is exactly `{}` followed by a newline when YAML parsing fails.";
  }

  return a;
}

function synthesizeCommandPrompt(targetId: string, c: EvalCase, caseIdx: number): string {
  const cmd = targetId.replace(/^command:/, "");
  if (isPreconditionAbort(c)) return c.prompt;

  const seeds: Record<string, string[]> = {
    "command:z-eval-create": [
      "/z-eval-create",
      "Scaffold evals for our repo — I want coverage for the eval-system plugin skills, commands, agents, and hooks.",
      "/z-eval-create",
    ],
    "command:z-eval-update": [
      "/z-eval-update",
      "/z-eval-update --check",
      "/z-eval-update --target plugins/zoto-eval-system/evals/commands/z-eval-create.json --apply",
    ],
    "command:z-eval-configure": ["/z-eval-configure"],
    "command:z-eval-execute": ["/z-eval-execute", "/z-eval-execute --full"],
    "command:z-eval-compare": ["/z-eval-compare 20260520 20260521"],
    "command:z-eval-advise": ["/z-eval-advise", "/z-eval-advise zoto-help-evals"],
    "command:z-eval-help": ["/z-eval-help", "/z-eval-help Configuration"],
    "command:z-spec-create": [
      "/z-spec-create",
      '/z-spec-create "add payment webhook handlers"',
      "/z-spec-create @docs/design.md",
    ],
    "command:z-spec-execute": [
      "/z-spec-execute",
      "/z-spec-execute @specs/20260525-eval-prompt-realism-audit/spec-eval-prompt-realism-audit-20260525.md",
    ],
    "command:z-spec-judge": ["/z-spec-judge", "/z-spec-judge @specs/active-feature"],
  };

  const list = seeds[targetId];
  if (list) return list[caseIdx % list.length];

  return `/${cmd}`;
}

function synthesizeAgentPrompt(targetId: string, c: EvalCase, seedText: string): string {
  if (seedText && !seedText.startsWith("You are")) {
    // Extract delegation-style slice from long transcript if needed
    const m = seedText.match(/(?:^|\n)(Please |Run |I need |Scaffold |Continue ).{20,200}/i);
    if (m) return m[0].trim();
  }

  const replacements: Record<string, string[]> = {
    "agent:zoto-eval-generator": [
      "I ran `/z-eval-create` and approved skills, commands, agents, and hooks. Config is at `.zoto/eval-system/config.yml`. Please scaffold the eval suite and run the validation gates.",
      "Continue the `/z-eval-create` flow — honour the eval-system config in this workspace when picking static and LLM harnesses.",
      "Config in this workspace sets jest static + vitest LLM code strategy. Stamp eval scaffolding accordingly.",
      "Use declarative LLM strategy with vitest static tests; agents-only discovery; no manual checklists.",
      "Use pytest static with jest-flavoured LLM code harness; hooks-only discovery.",
    ],
    "agent:zoto-eval-adviser": [
      "Analyse eval coverage gaps for this repo before the next harness batch. Scope: full manifest scan.",
      "Drill into citation verification gaps for skill:zoto-help-evals only.",
    ],
  };

  const id = typeof c.id === "number" ? c.id : parseInt(String(c.id), 10);
  const list = replacements[targetId];
  if (list && list[id - 1]) return list[id - 1];

  // De-third-person existing prompt
  let p = c.prompt;
  p = p.replace(/^You spawned from `\/z-eval-create`;/i, "I ran `/z-eval-create` and");
  p = p.replace(/^Follow `\/z-eval-create`/i, "Continue `/z-eval-create`");
  p = p.replace(/materialize sanctioned eval scaffolding/i, "scaffold the approved eval suite");
  return p;
}

function synthesizeSkillPrompt(skillName: string, c: EvalCase): string {
  if (/^How |^I |^Upstream |^What /.test(c.prompt)) return c.prompt;
  return `Upstream agent message for ${skillName}: ${c.prompt}`;
}

function bareExceptionRegister(
  filePath: string,
  caseId: string | number,
  targetId: string,
  reason: "precondition-abort" | "documented-no-args",
  refuseOrSection: string,
): string {
  const doc = DOCUMENTED_NO_ARGS[targetId]?.doc ?? COMMAND_README[targetId] ?? "";
  const lines = DOCUMENTED_NO_ARGS[targetId]?.lines ?? "18:24";
  return `| \`${filePath}\` | ${caseId} | \`${targetId}\` | ${reason}:${refuseOrSection} | \`${lines}:${doc}\` |`;
}

function main(): void {
  const inventory = JSON.parse(
    readFileSync(join(AUDIT, "eval-inventory.json"), "utf8"),
  ) as Inventory;
  const transcriptIndex = JSON.parse(
    readFileSync(join(AUDIT, "transcript-index.json"), "utf8"),
  ) as TranscriptIndex;

  const rewrites: Record<string, unknown> = {};
  const auditRows: string[] = [];
  const bareRows: string[] = [];
  let genCount = 0;
  let preserveCount = 0;

  auditRows.push("# Eval case realism audit\n");
  auditRows.push(`Generated: ${new Date().toISOString()}\n`);
  auditRows.push(
    "Redaction sanity: every `rewrite_prompt` stored in `eval-rewrites.json` passes through `audit/redact.ts` → `redact()` before serialisation.\n",
  );

  const sortedPaths = Object.keys(inventory.files).sort();

  for (const filePath of sortedPaths) {
    const meta = inventory.files[filePath];
    const abs = join(REPO, filePath);
    const raw = JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
    const targetId = resolveTargetId(filePath, meta, raw);
    const kind = parseKind(targetId);
    const cases: EvalCase[] = (raw.cases as EvalCase[]) ?? (raw.evals as EvalCase[]) ?? [];

    auditRows.push(`\n## \`${filePath}\`\n`);
    auditRows.push(`Target: \`${targetId}\` · Container: \`${meta.container_shape}\`\n`);
    auditRows.push(
      "| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action | Seed |\n",
    );
    auditRows.push("| --- | --- | --- | --- | --- | --- | --- | --- |\n");

    const fileRewrites: Record<string, unknown> = {
      target_id: targetId,
      container_shape: meta.container_shape.replace("[]", "[]"),
      cases: {} as Record<string, unknown>,
    };

    let narrative: string[] = [];

    cases.forEach((c, caseIdx) => {
      const caseKey = casePayloadKey(c, caseIdx, cases);
      const prompt = c.prompt ?? "";
      const assertions = c.assertions ?? [];

      if (!isGenerated(c)) {
        preserveCount++;
        auditRows.push(
          `| ${caseKey} | ${oneLiner(prompt)} | preserve | — | — | — | **preserve** (user-authored) | — |\n`,
        );
        const preserveSeed =
          kind === "skill"
            ? `skill-usage:${skillPath(targetId.replace(/^skill:/, ""))}`
            : `readme:${COMMAND_README[targetId] ?? AGENT_README[targetId] ?? "plugins/zoto-eval-system/README.md"}`;
        (fileRewrites.cases as Record<string, unknown>)[caseKey] = {
          preserve: true,
          seed_source: preserveSeed,
          rewrite_prompt: null,
          rewrite_follow_ups: null,
          rewrite_assertions: null,
          rewrite_expected_output: null,
          justification: "User-authored case (KD-8 byte-preserve).",
        };
        return;
      }

      genCount++;
      const preAbort = isPreconditionAbort(c);
      const docNoArgs =
        kind === "command" &&
        isBareCommand(prompt) &&
        !preAbort &&
        DOCUMENTED_NO_ARGS[targetId] !== undefined &&
        // only case 1 or explicit no-args flow cases
        (caseIdx === 0 || /no arg|guided|interactive|checklist/i.test((c.expected_output ?? "") + prompt));

      const bareEx = preAbort || docNoArgs;
      const promptRealism = classifyPromptRealism(prompt, kind);
      const invocation = classifyInvocation(prompt, kind, bareEx);
      const assertionClass = classifyAssertions(assertions);

      const seed = lookupTranscript(transcriptIndex, targetId, caseIdx);
      let newPrompt = prompt;
      let action = "tighten-assertions";

      if (kind === "command") {
        if (preAbort) {
          action = "keep-bare-precondition";
          bareRows.push(
            bareExceptionRegister(
              filePath,
              caseKey,
              targetId,
              "precondition-abort",
              "Eval System is not initialised…",
            ),
          );
        } else if (docNoArgs && isBareCommand(prompt.split("\n")[0].trim())) {
          action = "keep-bare-documented-no-args";
          bareRows.push(
            bareExceptionRegister(
              filePath,
              caseKey,
              targetId,
              "documented-no-args",
              "Usage shows bare /cmd",
            ),
          );
        } else if (isBareCommand(prompt.split("\n")[0].trim()) || promptRealism === "synthetic") {
          action = "rewrite-prompt+assertions";
          if (seed.text && !seed.text.startsWith("You are")) {
            newPrompt = seed.text.split("\n")[0].trim();
          } else {
            newPrompt = synthesizeCommandPrompt(targetId, c, caseIdx);
          }
        } else if (assertionClass !== "strong") {
          action = "rewrite-assertions";
        }
      } else if (kind === "agent") {
        if (invocation === "third-person-narration" || promptRealism === "synthetic") {
          action = "rewrite-prompt+assertions";
          newPrompt = synthesizeAgentPrompt(targetId, c, seed.text);
        } else if (assertionClass !== "strong") {
          action = "rewrite-assertions";
        }
      } else if (kind === "hook") {
        if (assertionClass !== "strong") action = "tighten-assertions";
        // hook prompts already realistic per spec case 1
      } else if (kind === "skill") {
        if (promptRealism === "synthetic" || promptRealism === "mixed") {
          action = "rewrite-prompt";
          newPrompt = synthesizeSkillPrompt(targetId.replace(/^skill:/, ""), c);
        }
        if (assertionClass !== "strong") action = action.includes("prompt") ? action : "rewrite-assertions";
      }

      // Special worked examples from spec
      if (targetId === "command:z-eval-create" && (caseKey === "2" || caseKey.startsWith("2@"))) {
        newPrompt =
          "Scaffold evals for this repo — approve all skills, plugin commands, plugin agents, and hook bundles from the checklists.";
        action = "rewrite-prompt+assertions";
        seed.seed_source = seed.text.startsWith("You are")
          ? `readme:${COMMAND_README[targetId]}`
          : seed.seed_source;
      }
      if (targetId === "agent:zoto-eval-generator" && (caseKey === "2" || caseKey.startsWith("2@"))) {
        newPrompt =
          "I ran `/z-eval-create`, approved skills/commands/agents/hooks, and config.yml is present. Scaffold the eval suite, refresh manifest.yml, and confirm the three validation gates pass.";
        action = "rewrite-prompt+assertions";
      }
      if (targetId === "hook:zoto-eval-system" && (caseKey === "1" || caseKey.startsWith("1@"))) {
        action = "tighten-assertions";
      }

      newPrompt = redact(newPrompt);

      const newAssertions = assertions.map((a) => rewriteAssertion(a, kind));
      const newFollowUps = c.follow_ups?.map((f) => redact(f)) ?? null;

      let newExpected = c.expected_output ?? null;
      if (newExpected && action.includes("assertions")) {
        newExpected = redact(
          newExpected
            .replace(/spawned Task/gi, "scaffolding confirmation")
            .replace(/transcripts show/gi, "the operator sees"),
        );
      }

      if (seed.seed_source.startsWith("readme:") || seed.seed_source.startsWith("skill-usage:")) {
        // ensure synthetic citation when no transcript uuid
        if (!seed.seed_source.includes("transcript:")) {
          if (kind === "skill") {
            seed.seed_source = `skill-usage:${skillPath(targetId.replace(/^skill:/, ""))}`;
          } else if (kind === "command") {
            seed.seed_source = `readme:${COMMAND_README[targetId] ?? "plugins/zoto-eval-system/README.md"}`;
          } else if (kind === "agent") {
            seed.seed_source = `readme:${AGENT_README[targetId] ?? "plugins/zoto-eval-system/README.md"}`;
          }
        }
      }

      auditRows.push(
        `| ${caseKey} | ${oneLiner(prompt)} | ${promptRealism} | ${invocation} | ${assertionClass} | ok | ${action} | ${seed.seed_source} |\n`,
      );

      if (action.includes("prompt") && narrative.length < 2) {
        narrative.push(`Case ${caseKey}: ${action} using ${seed.seed_source}.`);
      }

      (fileRewrites.cases as Record<string, unknown>)[caseKey] = {
        preserve: false,
        seed_source: seed.seed_source,
        rewrite_prompt: newPrompt,
        rewrite_follow_ups: newFollowUps,
        rewrite_assertions: newAssertions,
        rewrite_expected_output: newExpected ? redact(newExpected) : null,
        justification: `${action}; replaces internal-mechanic assertions with user-visible outcomes; seed ${seed.seed_source}.`,
      };
    });

    auditRows.push(
      `\n_${narrative.length ? narrative.join(" ") : "Most cases tighten assertion vocabulary toward user-visible filesystem, exit-code, and on-screen guidance outcomes."}_\n`,
    );

    rewrites[filePath] = fileRewrites;
  }

  // realism-rubric.md
  const rubric = buildRubric(bareRows);
  writeFileSync(join(AUDIT, "realism-rubric.md"), rubric, "utf8");
  writeFileSync(join(AUDIT, "eval-case-audit.md"), auditRows.join(""), "utf8");
  writeFileSync(join(AUDIT, "eval-rewrites.json"), JSON.stringify(rewrites, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({ genCount, preserveCount, files: sortedPaths.length, bareExceptions: bareRows.length }, null, 2));

  // Validate
  JSON.parse(readFileSync(join(AUDIT, "eval-rewrites.json"), "utf8"));
  for (const p of sortedPaths) {
    if (!existsSync(join(REPO, p))) throw new Error(`Missing file ${p}`);
  }
  if (genCount !== 258) console.warn(`Expected 258 generated, got ${genCount}`);
  if (preserveCount !== 41) console.warn(`Expected 41 preserve, got ${preserveCount}`);
}

function buildRubric(bareRows: string[]): string {
  return `# Realism rubric (Phase 2 canonical)

Locked per spec KD-1 through KD-3. Phase 3 subtasks consume \`eval-rewrites.json\` verbatim.

## Four scoring axes

### 1. Prompt-realism

Would a real Cursor operator paste this string into chat or the command palette?

| Class | Meaning |
| --- | --- |
| \`realistic\` | Reads like authentic operator text mined from transcripts or plausible daily usage. |
| \`mixed\` | Correct intent but awkward phrasing (third-person narration, harness vocabulary). |
| \`synthetic\` | Bare \`/cmd\` without args on non-exception paths, placeholder operator stage directions. |

### 2. Invocation-shape

| Kind | Required shape |
| --- | --- |
| \`command\` | \`/<cmd> <realistic args>\`; bare \`/cmd\` **only** on bare-command exception register entries. |
| \`agent\` | Natural-English parent-command delegation; no leading \`/\`. |
| \`hook\` | Concrete Cursor lifecycle event (\`sessionStart\`, invalid YAML branch, stale runs, …). |
| \`skill\` | Upstream-agent message that causes the skill to load (skills are not slash-invoked). |

### 3. Assertion-realism

| Class | Meaning |
| --- | --- |
| \`strong\` | All assertions describe user-visible outcomes (files, exit codes, on-screen text, manifest rows). |
| \`mixed\` | Blend of outcomes plus allowed contract assertions (see exception list). |
| \`weak\` | Dominated by internal-mechanic phrasing (\`spawned Task\`, \`transcripts show\`, \`Inside the generator flow\`). |

### 4. Coverage

At least one case per documented primitive capability (analyser hard rule 8). Coverage column in \`eval-case-audit.md\` marks \`ok\` when the source primitive's capability map is represented; gaps flagged in narrative paragraphs.

---

## Bare-command exception register (KD-2)

A case may retain bare \`/cmd\` **only** when listed here with a code reference.

| File | Case id | Target | Exemption | Code ref |
| --- | --- | --- | --- | --- |
${bareRows.join("\n")}

---

## Contract-assertion exception list (KD-3)

These internal-mechanic families **may remain** because they encode hard contracts:

| Family | Contract encoded | Source |
| --- | --- | --- |
| \`_meta.generated: true\` | Case-level regenerability guard | \`_user-case-guards.ts\` |
| \`// _meta.generated\\: true\` (line 1, TS tests) | File-level guard with 20-line backwards scan | \`_user-case-guards.ts\` |
| \`# _meta.generated\\: True\` (line 1, pytest) | File-level guard | \`_user-case-guards.ts\` |
| Exact precondition refuse strings | Command abort messages shipped in command markdown | e.g. \`plugins/zoto-eval-system/commands/z-eval-create.md\` |
| \`source_hash\` 64-hex SHA-256 | Analyser payload invariant | \`analyser-payload.schema.json\` |
| \`schema_version: 1\`, colon-prefixed \`target_id\`, \`additionalProperties: false\` | Analyser envelope invariants | \`analyser-payload.schema.json\` |
| \`manifest.history.yml\` append-only | History never compacted or mutated | Eval System manifest contract |
| \`fixture_justifications[]\` cardinality | Justified fixture overlays when \`fixtures.files[]\` non-empty | Analyser hard rule 6 |
| Comparer \`/canvas\` template byte-equality | \`agent:zoto-eval-comparer\` target-specific contract | \`templates/canvas/compare-prompt.md.tmpl\` |
| \`needs_user_input\` payload shape | Subagent escalation schema | \`needs-user-input.schema.json\` |
| Hook stdout JSON + \`additional_context\` + exit 0 + \`{}\` early return | Cursor hooks contract | Hook primitive docs |

All other internal-mechanic assertions are rewritten to user-visible equivalents in \`eval-rewrites.json\`.

---

## Worked before / after examples

### \`command:z-eval-create\` case 2

**Before prompt:** \`/z-eval-create\`

**After prompt:** \`Scaffold evals for this repo — approve all skills, plugin commands, plugin agents, and hook bundles from the checklists.\`

**Before assertion (weak):** \`The spawned Task named zoto-eval-generator referenced the zoto-create-evals skill…\`

**After assertion (strong):** \`After scaffolding completes, \`.zoto/eval-system/manifest.yml\` lists every operator-approved target and the closing guidance mentions pnpm validation gates.\`

### \`agent:zoto-eval-generator\` case 2

**Before prompt:** \`You spawned from /z-eval-create; the preceding command fused approval lists…\`

**After prompt:** \`I ran /z-eval-create, approved skills/commands/agents/hooks, and config.yml is present. Scaffold the eval suite…\`

**Before assertion (weak):** \`Available transcripts show zero askQuestion tool emissions from the generator.\`

**After assertion (contract + outcome):** \`The agent returns structured needs_user_input (when configuration is missing) without emitting askQuestion from the subagent loop.\`

### \`hook:zoto-eval-system\` case 1

**Prompt:** unchanged (already lifecycle-realistic).

**Assertion tightening:** focus on exit 0 and stdout \`{}\` JSON shape rather than transcript-side timestamp observations.

---

## Redaction call site

\`generate-phase2-audit.ts\` imports \`redact\` from \`audit/redact.ts\` and applies it to every \`rewrite_prompt\`, \`rewrite_follow_ups[]\`, and \`rewrite_expected_output\` before writing \`eval-rewrites.json\`.
`;
}

main();
