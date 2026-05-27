// _meta.generated: true
/**
 * LLM eval for agent `zoto-cursor-top-troubleshooter`.
 *
 * Generated from the legacy declarative JSON eval payload by
 * `scripts/eval-relocate-migration.ts` as part of spec
 * `20260526-eval-single-backend-colocated-restructure` (subtask 08).
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * The cleanup engine and overwrite gate both use
 * `plugins/zoto-eval-system/engine/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * source primitive and re-run `pnpm run eval:update --apply`, not this
 * emitted file.
 */
import { describe, it, afterAll, expect } from "vitest";

import type { LlmCaseDefinition } from "../../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../../evals/llm/_shared/run-llm-suite.js";

const CASES = [
  {
    "id": 1,
    "prompt": "I am on Linux with Cursor open and agents running, but `cursor-top` prints an empty table. Walk me through what to check before I change anything on disk.",
    "assertions": [
      "The reply tells me to capture `cursor-top --json --once` and paste it back so we can see current rows and diagnostics.",
      "The reply references Linux-specific checks such as `ps` style process listing and confirms both `~/.config/Cursor/` and `~/.cursor/` exist for this user.",
      "The reply states this workflow stays read-only toward Cursor application data.",
      "The closing report names my OS, my Cursor app version, and my `cursor-top` CLI version."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
      "last_updated": "2026-05-26T03:23:40.370Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
        "analysed_at": "2026-05-26T03:23:40.370Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Eval cases stress empty or partial cursor-top tables, blank columns, hierarchy flattening, unreadable discovery paths, and escalation while enforcing read-only handling, OS-specific directory checks, and mandatory version fields in the closing report.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A short triage plan that starts from `cursor-top --json --once`, walks through process discovery and the standard Linux Cursor data locations, and ends with concrete next checks without editing Cursor-owned files."
  },
  {
    "id": 2,
    "prompt": "Cursor desktop shows sessions in cursor-top, yet nothing from the Cloud Agent surface appears. Help me decide whether this is a discovery gap or I simply have not produced Cloud artefacts yet.",
    "assertions": [
      "The reply covers the split where some surfaces appear while another does not, consistent with partial discovery.",
      "The reply calls out Cloud-oriented paths such as `~/.cursor/projects/<workspace>/` when Cloud VMs are in play.",
      "The reply recommends ensuring the Cloud surface has run at least once so its session files exist before altering paths.",
      "The reply keeps recommendations advisory and does not tell me to rewrite Cursor storage files in place."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
      "last_updated": "2026-05-26T03:23:40.370Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
        "analysed_at": "2026-05-26T03:23:40.370Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Eval cases stress empty or partial cursor-top tables, blank columns, hierarchy flattening, unreadable discovery paths, and escalation while enforcing read-only handling, OS-specific directory checks, and mandatory version fields in the closing report.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Guidance that distinguishes missing Cloud session files from configuration issues, names where Cloud workspace metadata usually lives, and suggests running the Cloud surface once before deeper debugging."
  },
  {
    "id": 3,
    "prompt": "cursor-top lists rows, but MODEL, REPO, and the log preview column stay empty. What does that mean and what should I try next?",
    "assertions": [
      "The reply ties blank log slots to session metadata lacking `logPath` or similar mapping gaps.",
      "The reply suggests mitigations such as tuning how many log lines are shown when slots are empty.",
      "The reply asks me to report the Cursor version so path heuristics can be updated if needed.",
      "The reply still records OS, Cursor version, and `cursor-top` CLI version in the final summary."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
      "last_updated": "2026-05-26T03:23:40.370Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
        "analysed_at": "2026-05-26T03:23:40.370Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Eval cases stress empty or partial cursor-top tables, blank columns, hierarchy flattening, unreadable discovery paths, and escalation while enforcing read-only handling, OS-specific directory checks, and mandatory version fields in the closing report.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "An explanation tied to missing metadata such as absent `logPath`, practical UI or flag suggestions, and a request for version details to refine mapping."
  },
  {
    "id": 4,
    "prompt": "Subagent threads show up as if they were root-level sessions instead of nested under their parent. Diagnose that hierarchy issue.",
    "assertions": [
      "The reply attributes unexpected root-level subagents to session metadata missing `parentId` and related PID clues.",
      "The reply proposes remediation such as upgrading Cursor or forwarding a trimmed session excerpt for mapping fixes.",
      "The reply does not prescribe mutating Cursor log or session binaries on disk."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
      "last_updated": "2026-05-26T03:23:40.370Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
        "analysed_at": "2026-05-26T03:23:40.370Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Eval cases stress empty or partial cursor-top tables, blank columns, hierarchy flattening, unreadable discovery paths, and escalation while enforcing read-only handling, OS-specific directory checks, and mandatory version fields in the closing report.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "An explanation focused on missing `parentId` or PID metadata, upgrade or reporting guidance, and read-only inspection steps only."
  },
  {
    "id": 5,
    "prompt": "I installed Cursor through a sandboxed package manager and cursor-top JSON shows `diagnostics` entries marked unreadable for several paths. How should I interpret that and what remediation paths exist?",
    "assertions": [
      "The reply instructs me to read the `diagnostics` array inside `cursor-top --json` for `unreadable:` style entries.",
      "The reply mentions macOS translocation-class issues or Linux Flatpak or Snap installs as reasons paths may diverge from defaults.",
      "The reply reinforces that altering Cursor-managed data files is out of scope."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
      "last_updated": "2026-05-26T03:23:40.370Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
        "analysed_at": "2026-05-26T03:23:40.370Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Eval cases stress empty or partial cursor-top tables, blank columns, hierarchy flattening, unreadable discovery paths, and escalation while enforcing read-only handling, OS-specific directory checks, and mandatory version fields in the closing report.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A permissions-focused interpretation that cites the diagnostics array, explains sandbox path relocation, and lists safe verification steps rather than destructive edits."
  },
  {
    "id": 6,
    "prompt": "I already ran `cursor-top --json --once` and pasted the output, but you still cannot reproduce my symptom. Delegate the rest of the triage including when to pull in monitor guidance about CLI flags, and tell me exactly what artefacts to attach next.",
    "assertions": [
      "The reply escalates by asking me to attach the full `cursor-top --json` output plus content from one session file under my metadata tree.",
      "The reply leans on the `zoto-cursor-top-monitor` skill to reaffirm healthy CLI usage or flag tweaks.",
      "The reply repeats that troubleshooting remains read-only with respect to Cursor-owned stores.",
      "The final report again lists OS, Cursor version, and `cursor-top` CLI version."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
      "last_updated": "2026-05-26T03:23:40.370Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "186321cc6b24e289db7d7adfd25745da8cdb3cc0543da83780ad5a8021bafb2b",
        "analysed_at": "2026-05-26T03:23:40.370Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Eval cases stress empty or partial cursor-top tables, blank columns, hierarchy flattening, unreadable discovery paths, and escalation while enforcing read-only handling, OS-specific directory checks, and mandatory version fields in the closing report.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A structured escalation asking for fuller JSON plus a session snippet, invokes the monitor skill rationale for recommended flags, and repeats required version fields along with read-only posture."
  }
] as unknown as LlmCaseDefinition[];

defineLlmEval({
  targetId: "agent:zoto-cursor-top-troubleshooter",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
