# Subtask: Command, Agent & Skill Surface Ergonomics Review

## Metadata
- **Subtask ID**: 04
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-eval-architect
- **Dependencies**: 01
- **Created**: 20260523

## Objective

Critically review the plugin's user-facing surface — slash commands, agents,
skills, the help-routing rule, and the `askQuestion` / `needs_user_input`
contract — for redundancy, name-clash, friction in the happy-path lifecycle,
and "wrong default" decisions. Recommend specific cuts and unifications.

## Deliverables Checklist

- [x] `findings-04-surface-ergonomics.md` covering:

  - [x] **Command-aliasing redundancy**: `/z-eval-start`, `/z-eval-jump`, `/z-eval-operator`, `/z-eval-workflow` are all documented as "same delegation". Quantify confusion cost (operator must learn 4 names for 1 behaviour). Recommend either: keep one canonical (which?) and remove the others, or document a clear naming policy that justifies all four. → **F1 (major)**: keep `/z-eval-workflow`, delete the other three.

  - [x] **Lifecycle command list**: the 13-command surface (init, start, jump, operator, workflow, configure, create, update, execute, judge, compare, advise, help). Map each to the lifecycle stage it serves. Identify any stage with **>1 command** and any command without a clear stage. → Covered via "Recommended surface" table and F1/F9; the "workflow / router" stage is the only multi-command stage; `eval:analyse` is the orphan operation (no command).

  - [x] **Happy-path friction**: walk the canonical first-time user flow (install → init → configure → create → update → execute → judge → compare). For each step, note: required inputs, ambient assumptions (e.g. `CURSOR_API_KEY`), error states surfaced, retry path. Flag points where the user must read the README to understand what to do next. → **F2, F4, F15** cover catch-22 at help, jargon-heavy configure, 4-checklist create.

  - [x] **`askQuestion` / `needs_user_input` contract**: the rule states commands own `askQuestion` and subagents return structured `needs_user_input` blocks. Is this contract uniformly enforced across all 9 skills and 8 agents? Identify any agent or skill that bypasses or partially implements the contract. → Contract is **uniformly enforced** across all 9 skills + 8 agents (every reviewed file states "Never call askQuestion"). The only documented carve-out is `/z-eval-compare`'s no-resume run-folder disambiguation → **F10 (minor)** recommends dropping the carve-out.

  - [x] **Help-intent routing rule**: the `zoto-eval-system.mdc` rule says agents MUST invoke `/z-eval-help` before answering ANY question about evals. Assess: scope, failure mode, and citation requirement quality. → **F2 (major)**: rule is overbroad; first-run catch-22; trivial questions pay heavy machine; recommendation: drop `alwaysApply: true` + config-less-safe help.

  - [x] **Error message review**: missing config, missing manifest, missing API key, framework/strategy switch without cleanup, drift detected. → Actionability mostly good; primary issue is that the **same canonical "init first" message is duplicated in 12 commands** (**F7 minor**) and the missing-config message contradicts the help-routing rule (**F2**). All error message paths cited with line refs in findings doc.

  - [x] **Naming consistency**: `zoto-*-evals` skills vs `zoto-eval-*` agents vs `/z-eval-*` commands. → **F8 (minor)**: asymmetry is real, rename cost is M (8 skill dirs + ~50 cross-refs); recommend unify under `zoto-eval-<verb>` OR call out in README.

  - [x] **Discoverability**: how does a user discover commands, skills, and the rule? → Discussed under F2 (help catch-22) and F1 (rule catalogue carries 4 alias rows blocking the lifecycle commands).

  - [x] **Hook ergonomics**: session-start hook noise / actionability / "no config" handling. → **F5 (major)**: respects "no config" silently (good); but missingEvals() ignores `config.skillsRoots`; drift banner fires on time-throttle, not real drift; up to 3 banners can stack. Recommendation: real drift check, config-aware skill discovery, configurable thresholds, one banner per session.

  - [x] **Subagent fan-out**: → **F3 (major)**: 4 of 8 agents (`comparer`, `judge`, `adviser`, `executor`) are 30–60-line thin wrappers; `/z-eval-help` already demonstrates the command-skill-direct shortcut. Recommendation: delete those four agents, keep `generator`, `updater`, `configurer`, `analyser-subagent`.

- [x] **Findings ledger** (top of document): every finding with severity (info | minor | major | blocker), confidence, and effort estimate. → 15 findings, severity-confidence-effort table at top of findings doc.

- [x] **Recommended surface-after-cuts table**: proposed final list of commands / skills / agents post-simplification, with deletion + rename annotations. → Table at end of findings doc; 32 → 25 components (-22%).

- [x] No file mutations.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-04/`.
- [x] Every "remove" recommendation cites at least one alternative path that retains the user-facing capability.
- [x] The recommended surface table has lower component count than the current surface (or explicit justification why not). → 32 → 25 (-7); even with optional additions, surface shrinks 22%.
- [x] No mutations outside this subtask's directory.

## Implementation Notes

- Reference subtask 01's inventory for the current surface — do not re-enumerate.
- The 4-alias `/z-eval-start` family is the most visible redundancy; lead with it.
- The help-routing rule is `alwaysApply: true` — assess the cost of that rigidity.
- For ergonomics findings, **always cite a concrete user scenario** (e.g. "operator runs `/z-eval-execute` before `/z-eval-create`") — not abstract critique.

## Testing Strategy

**IMPORTANT**: Analysis only. Do NOT run any test suite or eval script.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-architect
- Started: 2026-05-23
- Completed: 2026-05-23

### Work Log
- Loaded subtask-04 spec + findings-01 inventory; did not re-enumerate.
- Read all 13 commands (`<plugin>/commands/*.md`), all 8 agents, all 9 skills, the rule, the README, the session-start hook, and the plugin manifest from `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`.
- Cross-referenced the inventory's "Lifecycle triad" (§5) and "Counts summary" (§7) against the live files.
- Grepped `askQuestion` usage across skills (uniformly negation-only — contract holds) and `config.json` (6 stale references in shipped skills, runtime templates handled in subtask 02).
- Authored `findings-04-surface-ergonomics.md` with 15 findings, severity ledger, per-finding citations, and a recommended-surface table.

### Blockers Encountered
None. All evidence accessible from the authoritative local mirror.

### Files Modified
- `specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md` (new — 15 findings + recommended surface)
- `specs/20260523-eval-plugin-review/subtask-04-eval-plugin-review-surface-ergonomics-20260523.md` (this file — checklist + execution-notes tick-through)

No plugin source, host config, or `_runs/` artefacts were modified.

### Adversarial Verification (zoto-spec-judge, 2026-05-23)

Independent verification performed against the authoritative plugin mirror at
`/home/andrewv/.cursor/plugins/local/zoto-eval-system/`. All Deliverables Checklist
and Definition of Done items confirmed; checklist state above is authoritative.

Spot-check results:

- **F1 (4-alias family)** — PASS. `z-eval-start.md`, `z-eval-jump.md`, `z-eval-operator.md` all 40 lines; lines 16–33 (Precondition + Delegate routing semantics) are verbatim across the three aliases, all delegating to `z-eval-workflow.md`. The canonical `z-eval-workflow.md` (63 lines) carries the actual Probe / Lifecycle router / Resolution sections. Recommendation "keep workflow, delete the other three" is sound.
- **F2 (help-routing rule + first-run catch-22)** — PASS. `rules/zoto-eval-system.mdc` line 3: `alwaysApply: true` confirmed. Lines 28–34 carry the "MUST invoke `/z-eval-help` before answering ANY question" mandate. `commands/z-eval-help.md` lines 19–25 enforce the `.zoto/eval-system/config.yml` precondition with an abort — the catch-22 is real (rule forces routing, routed command refuses pre-init).
- **F3 (thin-wrapper agents)** — MOSTLY PASS with one nit. `wc -l` results: comparer=31, judge=36, adviser=61, executor=44. Stated range is 30–60 lines; **adviser is 61** (one line over). Underlying finding still holds — adviser is functionally a thin wrapper around the `zoto-advise-evals` skill — but the stated bound should read "30–62 lines" for strict accuracy.
- **askQuestion contract** — PASS. Spot-checked 2 agents (`zoto-eval-comparer.md` line 31: "**Never** call `askQuestion`"; `zoto-eval-judge.md` line 35: "**Never** call `askQuestion`") and 2 skills (`zoto-execute-evals/SKILL.md` line 104: "Do **not** call `askQuestion`"; `zoto-configure-evals/SKILL.md` line 171: "Do **not** call `askQuestion`"). Contract is uniformly enforced. The documented `/z-eval-compare` carve-out (F10) is correctly identified as the only exception.
- **Surface-count math** — PASS. Authoritative directory listings: `commands/` has 13 files, `skills/` has 9 directories, `agents/` has 8 files. Recommended targets (11 / 8 / 4) are arithmetically consistent with the change column in §"Recommended surface — after cuts" (-3 router commands + 1 added `/z-eval-analyse` = -2; -1 `zoto-eval-tooling`; -4 thin-wrapper agents).
- **Scope discipline** — PASS. Subtask-04 only touched files under `specs/20260523-eval-plugin-review/findings-04/` and this subtask file. All other modified/untracked entries surfaced by `git status` (e.g. `.crux/`, `.cursor/agents/crux-*`, `.cursor/skills/crux-*`, `AGENTS.md`, `CRUX.md`, `.zoto/`, `.cursor/agents/zoto-eval-{architect,engineer}.md`) pre-date this subtask per the initial conversation snapshot.

**Verdict: Verified.** All 14 Deliverables Checklist items and all 4 Definition of Done items independently confirmed. The single nit (F3 line-range bound) is documentation-only and does not require unticking.
