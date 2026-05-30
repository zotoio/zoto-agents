# Assessment: Command Prefix Shortening (`zoto-*` → `z-*`)

- **Date**: 2026-05-06
- **Assessed by**: zoto-spec-judge (independent, fresh-context)
- **Spec under review**: `specs/20260506-command-prefix-shortening/`
- **Mode**: Mode 3 — pre-execution spec assessment

## Verdict

**Approve-with-changes** — overall score **3.7 / 5.0**.

The spec is structurally sound, the chosen alias-rename approach is implementable in Cursor's command system, agent assignments correctly map to `AGENTS.md`, and the dependency graph is clean. However, the spec **misses an entire command/agent/skill triad** (`/zoto-eval-advise` + `zoto-eval-adviser` agent + `zoto-advise-evals` skill) that was added by the `20260506-eval-adviser` spec and is already referenced by the eval-system integration rule. Subtask 03 hard-codes 8 verbs, and subtask 07 hard-codes "exactly 16 files" — both will under-count by one command pair. Subtask 01's inventory sweep is a partial safety net but the explicit downstream checklists need to be corrected before execution.

## Score Card

| Dimension | Score | Notes |
|---|---|---|
| Quality (clarity / completeness of each subtask) | 4.0 | Each subtask has a clear objective, deliverables, DoD, and implementation notes. |
| Feasibility (Cursor commands as markdown) | 4.5 | Alias delegation is implementable; commands ARE markdown the agent reads. Help-style commands need a more explicit idiom (see Risk). |
| Completeness (reference surfaces in scope) | 3.0 | Misses `/zoto-eval-advise` triad. Out-of-Scope identifier list omits 3 names. |
| Risk awareness | 4.0 | Acknowledges CRUX desync, transcripts, marketplace, eval drift, command-owned `askQuestion`. |
| Structure (graph, phasing, agent assignment) | 4.5 | Phase ordering is correct; agent assignments match `AGENTS.md` exactly. |
| Convention compliance | 4.0 | Respects `.cursor/rules/_CRUX-RULE.mdc`, `.zoto/<plugin-suffix>/` convention, and `Reviewer Non-Interference` rule. |

## Findings

### Blockers

_None._ The inventory subtask (01) provides a partial safety net, but the explicit downstream checklists contain enough wrong numbers / missing entries that a mechanical executor would ship an incomplete rename. These are major issues that must be fixed before execution, but they do not invalidate the overall design.

### Major

**M1. Missing `/zoto-eval-advise` command pair across the spec.**
The eval-system plugin currently has **9** commands, not 8 — the `20260506-eval-adviser` spec landed `commands/zoto-eval-advise.md`. The integration rule [`plugins/zoto-eval-system/rules/zoto-eval-system.mdc`](../../plugins/zoto-eval-system/rules/zoto-eval-system.mdc) line 20 lists it as a first-class command. The spec under review:

- subtask-03 deliverables enumerate `init,configure,create,update,execute,judge,compare,help` — only 8 verbs. `advise` is missing.
- subtask-03 objective says *"the seven other verbs"*.
- subtask-07 D06 hard-codes *"exactly 16 files: 8 canonical + 8 alias"* — should be 18.
- spec index "Requirements" #2 lists `z-eval-{create,execute,configure,judge,update,compare,help,init}.md` — missing `advise`.
- spec index "In Scope" file list — missing `z-eval-advise.md` and `zoto-eval-advise.md`.
- spec index "Definition of Done" — implicitly assumes 8.

**M2. Missing identifiers in "Out of Scope".**
Three identifiers introduced by the `20260506-eval-adviser` spec are not enumerated in the spec's Out-of-Scope identifier lists:
- Skill `zoto-advise-evals` (and `zoto-eval-tooling`, which is unrelated to advise but also missing — it's listed in the eval-system integration rule but not in the spec's skill list).
- Agent `zoto-eval-adviser`.

Without these, subtask 07's diff guard does not know they are legitimately untouchable identifiers. A diligent executor could either rename them (wrong) or skip them (right but accidental).

**M3. Subtask 04 D10 uses "etc." for skill enumeration.**
Open-ended *"`zoto-help-evals`, `zoto-create-spec`, `zoto-judge-spec`, `zoto-create-evals`, `zoto-update-evals`, etc."* risks missing `zoto-execute-evals`, `zoto-judge-evals`, `zoto-compare-evals`, `zoto-configure-evals`, `zoto-advise-evals`, `zoto-eval-tooling`, plus `zoto-execute-spec`. Convert to an explicit list.

**M4. Subtask 05 missing `zoto-advise-evals/evals/evals.json`.**
Subtask 05 enumerates `zoto-help-evals` plus `zoto-create-evals`/`zoto-update-evals`/`zoto-execute-evals`/`zoto-judge-evals`/`zoto-compare-evals` cases, but does not list `zoto-advise-evals/evals/evals.json` (which exists and contains slash-command literals). Add an alias-coverage case for the advise skill too.

### Minor

**m1. Validator-requirement claim is incorrect.**
Subtask 02 states *"Frontmatter `name:` matches the file basename in every case (validator requirement)"*. `scripts/validate-template.mjs` (`validateComponentFrontmatter` → `validateFrontmatterFile`) only requires `name` and `description` to be **present and non-empty**; it does NOT enforce a name == basename match. Reword to *"convention requirement"* / *"plugin convention"* — keeping the convention is fine, but the rationale shouldn't cite a non-existent validator check.

**m2. Help-style alias delegation idiom not explicit.**
Subtask 03 acknowledges that `/zoto-eval-help` owns `askQuestion` pre-collection, but the alias delegation snippet in subtask 02 (*"spawn the same subagent + skill, pass `$ARGUMENTS`"*) is not sufficient for commands that pre-collect before spawning. For `/zoto-eval-help` and `/zoto-eval-advise` (which has TWO command-owned breakpoints per the eval-adviser spec), the alias body must instruct the agent to **read and follow the canonical file's instructions verbatim** rather than invent its own pre-collection. Document this as a reusable idiom in subtask 02 implementation notes and reference it from subtask 03.

**m3. `docs/zoto-eval-system.md` already drifted.**
[`docs/zoto-eval-system.md`](../../docs/zoto-eval-system.md) line 17 lists 7 commands and is missing `/zoto-eval-init` and `/zoto-eval-advise` — drifted before this spec was written. Subtask 04 D18 says *"replace the command list with the new canonical names"*; mechanical replacement preserves the existing gap. Add a line: *"also realign the list to all 9 current commands"*.

**m4. `.cursor/agents/zoto-plugin-manager.md` already drifted.**
Line 390 lists three spec commands (`/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute`) and omits `/zoto-spec-init`. Subtask 04 D21 will mechanically rename what's there; add an explicit note to also include `/z-spec-init` in the rewrite.

**m5. Subtask 06 mentions a non-existent `AGENTS.md` inline CRUX block.**
The deliverable says *"Apply the same regeneration to `AGENTS.md`'s CRUX header section if present"*. The current `AGENTS.md` carries `<CRUX agents="always">` as a tag, not a `⟦CRUX:...⟧` block. The conditional *"if present"* makes this technically harmless, but the sentence misleads — clarify that no inline CRUX block currently exists and the deliverable is a guard against future regression.

**m6. Subtask 06's CRUX scan will likely be a no-op for this spec.**
The only CRUX-derived files in the repo are `install.crux.md` and `.cursor/rules/crux-memories-integration.crux.mdc`. Neither references `/zoto-spec-*` or `/zoto-eval-*` slash commands. Subtask 06 already says *"completes immediately with a 'no candidates' status"* if no edits land on a CRUX-source — that's correct, just worth surfacing in the executor's expectation so it doesn't expect output.

**m7. Root `README.md` confirmed clean.**
Repo root `README.md` contains zero `/zoto-spec-*` or `/zoto-eval-*` slash commands — only `[zoto-spec-system](plugins/...)` link paths. Spec correctly omits it. Worth adding a one-liner in subtask 04's notes confirming "verified clean" so the executor doesn't second-guess.

## Out-of-Scope Correctness

Spot-checked the spec's exclusions against the codebase:

| Exclusion in spec | Reality | Verdict |
|---|---|---|
| `plugins/zoto-spec-system/`, `plugins/zoto-eval-system/` (folders) | Match `marketplace.json` `plugins[].source`. | ✓ correct |
| Plugin manifest `name` (`zoto-spec-system`, `zoto-eval-system`) | Confirmed. | ✓ correct |
| Skill identifiers list (10 skills) | Codebase has **12** skills total — missing `zoto-advise-evals` and `zoto-eval-tooling`. | ✗ **M2** |
| Agent identifiers list (10 agents) | Codebase has **11** agents — missing `zoto-eval-adviser`. | ✗ **M2** |
| `.zoto/spec-system/`, `.zoto/eval-system/` (workspace-local config dirs) | Match `.cursor/rules/zoto-plugin-conventions.mdc`. | ✓ correct |
| Internal `package.json` scripts | Verified — no scripts use slash-command literal alias names. | ✓ correct |
| `.cursor-plugin/marketplace.json` | Verified — manifest does not list individual commands. | ✓ correct |
| `pnpm-lock.yaml` | Out of scope. | ✓ correct |
| `specs/**` and execution reports | Historical; out of scope. | ✓ correct |

## Feasibility Confirmation

- **Cursor commands ARE markdown the agent reads when the user types `/cmd`.** Therefore the alias delegation pattern works mechanically — an alias file says "follow `commands/z-spec-create.md`" and the agent does.
- **Validators don't enforce a prefix.** Confirmed `scripts/validate-template.mjs` only checks frontmatter has `name` + `description` — adding `z-spec-*` / `z-eval-*` files alongside `zoto-spec-*` / `zoto-eval-*` files passes without changes.
- **Plugin manifest exposes `commands: "./commands/"` (a directory)**, so any `*.md` file with valid frontmatter inside that directory is discovered as a command. Both old and new files coexist freely.
- **Agent assignments match `AGENTS.md`** exactly:
  - 01 → `crux-platform-architect` (architecture/inventory)
  - 02–03, 05 → `crux-software-engineer` (code/feature implementation)
  - 04 → `docs-sync-agent` (documentation sync after source changes)
  - 06 → `crux-cursor-rule-manager` (CRUX regeneration)
  - 07 → `integrity-expert` (CI/CD/quality audit)

## Risk Analysis

| Risk | Severity | Mitigation present? |
|---|---|---|
| Breaking active sessions / saved transcripts | Low | ✓ Aliases preserved indefinitely. |
| Marketplace metadata mismatch | Low | ✓ Out of Scope; subtask 07 D09 verifies. |
| Eval drift on rename | Medium | ✓ Subtask 05 owns structured-data updates; analyser cache regenerates on demand. |
| CRUX desync after rule edit | Medium | ✓ Subtask 06; will be a no-op for this spec but the safety check is correct. |
| Hook session-start nudge gives stale name | Low | ✓ Subtasks 04 D11/D12. |
| Command-owned `askQuestion` workflow drift via alias | **Medium** | Partial — needs explicit idiom (m2). |
| Inventory misses recent additions (`/zoto-eval-advise`) | **Medium-High** | ✗ Spec under-counts; relying on subtask 01 alone is fragile. |

## Proposed Fixes

If approved, I would apply the following surgical edits to the spec files (no source-code edits):

### Fix A — `spec-command-prefix-shortening-20260506.md`

1. **"In Scope" file list**: add `z-eval-advise.md` (canonical) and `zoto-eval-advise.md` (alias).
2. **"Out of Scope" — Skill identifiers**: append `zoto-advise-evals` and `zoto-eval-tooling`.
3. **"Out of Scope" — Agent identifiers**: append `zoto-eval-adviser`.
4. **Requirements** #2: add `advise` to the eval-system command list.
5. **Definition of Done**: change "Every command in `plugins/zoto-eval-system/commands/`" wording to make the count explicit (9 canonical + 9 alias).
6. Add a small **"Verified-clean surfaces"** note: root `README.md` and `.cursor-plugin/marketplace.json` confirmed to contain no slash-command literals.

### Fix B — `subtask-03-...-eval-commands-...md`

1. Update Objective: change "the seven other verbs" → "the eight other verbs".
2. Add deliverables:
   - "Create `plugins/zoto-eval-system/commands/z-eval-advise.md` — canonical, mirrored from `zoto-eval-advise.md`."
   - "Convert `plugins/zoto-eval-system/commands/zoto-eval-advise.md` to a thin alias for `/z-eval-advise`."
3. Definition of Done: "All eight" → "All nine".
4. Implementation Notes: add a paragraph documenting the alias delegation idiom for commands with command-owned `askQuestion` (`/zoto-eval-help`, `/zoto-eval-advise`): the alias must direct the agent to *"read and follow the canonical file's instructions verbatim with `$ARGUMENTS` passed through. Do not duplicate or paraphrase the instructions here."*

### Fix C — `subtask-02-...-spec-commands-...md`

1. Reword *"(validator requirement)"* → *"(plugin convention)"* on the `name:` == basename line.
2. Add the same alias-delegation-idiom paragraph as Fix B (cross-reference for symmetry).

### Fix D — `subtask-04-...-docs-and-rules-...md`

1. D09: explicitly list `zoto-eval-adviser.md` alongside the other eval-system agent files (body edits only, identifier untouched).
2. D10: replace "etc." with the explicit skill list:
   - eval-system: `zoto-help-evals`, `zoto-advise-evals`, `zoto-create-evals`, `zoto-update-evals`, `zoto-execute-evals`, `zoto-judge-evals`, `zoto-compare-evals`, `zoto-configure-evals`, `zoto-eval-tooling`.
   - spec-system: `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec`.
3. D18: append "and realign the command list to cover all 9 current commands (`init`, `configure`, `create`, `update`, `execute`, `judge`, `compare`, `help`, `advise`)".
4. D21: append "include `/z-spec-init` in the rewrite even if the current text only lists three commands".
5. Add D24: *"Confirm root `README.md` and `.cursor-plugin/marketplace.json` contain no slash-command literals (verified at spec time; sanity re-check post-edits)."*

### Fix E — `subtask-05-...-schemas-and-evals-...md`

1. Add deliverable: *"Update `plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json` cases that hard-code slash-command prompts/expected_output."*
2. Extend the alias-coverage requirement: add a sibling `/zoto-eval-advise` alias case to `zoto-advise-evals/evals/evals.json`.

### Fix F — `subtask-07-...-verification-...md`

1. D06: change "exactly 16 files: 8 canonical (`z-eval-{init,configure,create,update,execute,judge,compare,help}.md`) plus 8 alias" → **"exactly 18 files: 9 canonical (`z-eval-{init,configure,create,update,execute,judge,compare,help,advise}.md`) plus 9 alias (`zoto-eval-{...,advise}.md`)"**.
2. D08: extend the alias-coverage check to also exercise `zoto-advise-evals` evals.
3. D09: extend the diff-guard list with `zoto-advise-evals/SKILL.md` (frontmatter `name:` only), `zoto-eval-tooling/SKILL.md` (frontmatter `name:` only), and `zoto-eval-adviser.md` (frontmatter `name:` only) — body edits remain in scope per subtask 04.

### Fix G — `subtask-06-...-crux-sync-...md`

1. Reword the `AGENTS.md` deliverable to clarify there is currently no inline `⟦CRUX:...⟧` block in `AGENTS.md`; the deliverable becomes a guard against future regression.
2. Add explicit expectation: *"Most likely outcome for this spec is a no-op (no CRUX file's source contains a `/zoto-spec-*` or `/zoto-eval-*` slash command). Record `extra.judge.notes: 'no candidates'` rather than failing."*

### Fix H — `status/subtask-{03,04,05,07}-*.status.yml`

After applying Fixes A–G to the markdown subtask files, re-scaffold the corresponding `.status.yml` files via `pnpm run spec-status-roundtrip -- scaffold` (or equivalent) so the checklist text in the YAML matches the updated subtask markdown. The schemas, ids (`D01`–`Dnn`), and `state: pending` stay intact; only `text:` lines refresh.

## Recommendation

I would not block execution outright, but I strongly recommend applying Fixes A–H before `/zoto-spec-execute` runs. Without them, subtask 07 will report "all 16 files present" while two real command files (`zoto-eval-advise.md` and the new canonical `z-eval-advise.md`) silently diverge from the rename scheme, and the integration rule will continue routing users to a name that may or may not have been processed.

Per the `Reviewer Non-Interference` rule, I am NOT applying these fixes unilaterally — awaiting parent-agent / user confirmation.

---

## Fixes applied — 2026-05-06

The user (via the parent agent) approved Fixes A–H. The following surgical edits were made to spec files only — no source files were touched. Spec status was bumped from **Draft → Ready for Review**.

- **Fix A (spec index)** — added `z-eval-advise.md` / `zoto-eval-advise.md` to "In Scope"; appended `zoto-advise-evals` and `zoto-eval-tooling` to skill-identifier "Out of Scope" and `zoto-eval-adviser` to agent-identifier "Out of Scope"; added `advise` to Requirements #2; rewrote DoD to specify exactly **8 spec-system + 18 eval-system command files**; added new "Verified-clean surfaces" subsection covering root `README.md`, `marketplace.json`, root `package.json`.
- **Fix B (subtask 03)** — Objective wording "seven other verbs" → "eight other verbs"; added two new deliverables for `z-eval-advise.md` (canonical) and the alias-conversion update; cross-referenced subtask 02's `askQuestion`-owning alias delegation idiom for `/zoto-eval-help` and `/zoto-eval-advise`; expanded DoD from "All eight" to "All nine" plus a `/zoto-eval-advise` two-breakpoint preservation gate; added `zoto-eval-adviser` / `zoto-advise-evals` / `zoto-eval-tooling` to the out-of-scope reminder.
- **Fix C (subtask 02)** — replaced "(validator requirement)" with "(plugin convention — validator only enforces name/description present)" in deliverables and Implementation Notes; added a full **"Alias delegation idiom for `askQuestion`-owning commands"** subsection with a worked `/zoto-eval-help` example so the canonical "read and follow the canonical file's instructions verbatim" pattern is reusable across the spec.
- **Fix D (subtask 04)** — replaced D09's open-ended "agents/*.md" with the explicit 3 spec-system + 8 eval-system agent files (now including `zoto-eval-adviser.md`); replaced D10's `etc.` skill list with the explicit 3 spec-system + 9 eval-system skill list (including `zoto-advise-evals` and `zoto-eval-tooling`); D18 now requires realigning `docs/zoto-eval-system.md` to all 9 current commands (not just a 1:1 swap that would preserve the existing `init` / `advise` gap); D21 now requires `/z-spec-init` to be added when rewriting `.cursor/agents/zoto-plugin-manager.md` line ~390; new D24 adds a sanity guard for root `README.md`.
- **Fix E (subtask 05)** — `evals.json` enumeration replaced with the explicit list including `zoto-advise-evals/evals/evals.json`, `zoto-configure-evals/evals/evals.json`, and `zoto-eval-tooling/evals/evals.json`; alias-coverage requirement expanded to one case per `askQuestion`-owning command (`/zoto-eval-help` and `/zoto-eval-advise`) plus one Spec System skill; DoD updated accordingly.
- **Fix F (subtask 07)** — D06 changed from "exactly 16 files: 8 canonical + 8 alias" to **"exactly 18 files: 9 canonical + 9 alias"** with explicit verb list; D07 now also asserts the `askQuestion`-owning aliases use the "read and follow" idiom; D08 now requires running the `zoto-advise-evals` eval suite; D09 diff-guard now explicitly enumerates `zoto-advise-evals` / `zoto-eval-tooling` skills and `zoto-eval-adviser` agent.
- **Fix G (subtask 06)** — reworded the `AGENTS.md` deliverable to record the verified-at-spec-time state (no inline `⟦CRUX:...⟧` block currently exists; deliverable becomes a future-regression guard); appended an "Expected outcome for THIS spec" subsection to DoD documenting the no-op outcome and the only two CRUX-derived files in the repo (`install.crux.md`, `crux-memories-integration.crux.mdc`) plus a recipe for recording `extra.judge.notes: "no candidates"`.
- **Fix H (status pairs)** — deleted and re-scaffolded `status/subtask-{02,03,04,05,06,07}-*.status.{md,yml}` via `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts scaffold --spec-dir specs/20260506-command-prefix-shortening` so the YAML checklist text matches the updated subtask markdown. Subtask 01's status pair was untouched (no markdown change). All 7 status pairs now validate cleanly via the roundtrip script's `validate` subcommand. Final checklist counts: subtask-01 = 8, subtask-02 = 12, subtask-03 = 16, subtask-04 = 24, subtask-05 = 13, subtask-06 = 8, subtask-07 = 12.

After fixes, the spec is **Ready for Review** and safe to drive through `/zoto-spec-execute` once the user is satisfied with the changes.
