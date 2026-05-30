---
name: zoto-execute-spec
description: Executes an engineering spec by spawning subagents for each subtask, tracking progress, adversarial verification, and final quality checks. Use when a spec exists under the configured specs directory and is ready for execution.
---

# Spec System Execute Spec

Executes an existing engineering spec by coordinating subagents, tracking progress, and verifying completion. This workflow is repo-agnostic beyond `.zoto/spec-system/config.yml` and the spec files themselves.

## Configuration

Before execution, read `.zoto/spec-system/config.yml` from the repository root. **The file MUST exist** — if it does not, abort with the message *"Run `/z-spec-init` first to scaffold `.zoto/spec-system/config.yml`."* A file consisting of only commented lines parses to an empty mapping and is valid (every key falls back to its schema default). Use these values in user-facing text and limits:

| Key | Default | Use |
|-----|---------|-----|
| `specsDir` | `specs` | Root directory for spec folders; substitute `{specsDir}` in paths below |
| `unitOfWork` | `spec` | Singular term in messages (e.g. spec scope, nudges) |
| `spec.parallelLimit` | `4` | Maximum concurrent subagents during a phase |
| `subagents.default.tokenBudget` | (from template) | Default token budget; merged per-role overrides use `subagents.<role>.tokenBudget` |
| `aggregator.pollIntervalMs` | `1500` | Aggregator poll interval (live-reloadable) |
| `aggregator.debounceMs` | `250` | Aggregator debounce (live-reloadable) |

### Live Reload

Config is loaded via **`loadConfig(repoRoot, prevMtimeMs)`** (**`.zoto/spec-system/config.yml`**). The **`spec-aggregator --watch`** process calls **`loadConfig`** at the **start of each poll iteration** (default **`aggregator.pollIntervalMs: 1500`**).

**Token budget changes apply to the next spawned subagent without restarting the executor.**

On each spawn, the executor LLM runs:

`tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role <role> --status-yml <path> --status-md <path>`

That prints a prefix whose first line is verbatim (with resolved **N**):

`Token budget: <N>. Stay within this budget; record the resolved value in your status.yml token_budget field; if you exceed it, add a warn-level entry to your status.yml errors[] array.`

**Reload failure:** If validation fails on reload (**`ConfigValidationError`**), the watch process **keeps the previous valid config in memory**, appends an **`events[]`** entry on the spec-root **`status.yml`** with **`severity: error`** and **`kind: "config_reload_failed"`**, and continues. If **`spec-spawn-prefix.ts`** exits non-zero (same loader path; rare), the executor **falls back to the last successfully resolved prefix** and proceeds with the spawn.

**Live-reloadable (next spawn or next aggregator tick)** — `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, `spec.parallelLimit`.

**Require a fresh invocation** — `unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*`.

### Legacy spec compatibility

If **`<specDir>/status/`** is missing, the executor logs **`"status/ directory absent — running legacy spawn path"`**, does **not** start **`spec-aggregator --watch`**, and does **not** run **`spec-spawn-prefix`**; subagents on that path do not get status file paths in the prompt prefix.

## When to Use

Use this skill when a spec exists under `{specsDir}/` with status **Ready for Review** (or the user explicitly requests execution of a **Draft** spec). The spec should follow the format produced by the `zoto-create-spec` skill or an equivalent manifest layout.

## Workflow

### Step 1: Load Spec and Validate Manifest

1. Read the spec index file (`spec-[feature-name]-[yyyymmdd].md`) under the relevant `{specsDir}/[feature-directory]/`
2. Parse the **Subtask Manifest** table — source of truth for subtask-to-agent mapping and dependency ordering
3. For each row in the manifest:
   - Verify the subtask file exists at the listed path
   - Read the subtask file and confirm its Metadata section matches the manifest (same subagent, same dependencies)
   - Confirm no subtask depends on a higher-numbered subtask ID
4. Build the execution order from the manifest's Phase column
5. If any inconsistencies are found (missing files, mismatched agents, dependency violations), report them and stop

### Step 2: Confirm Execution

Present the manifest as the execution summary, then use the **`askQuestion`** tool to get structured user approval. Use `unitOfWork` from config where it fits the repository's vocabulary (e.g. describing the spec or scope).

First, display the summary in your response text:

```
## Execution Summary

- **Spec**: [feature name]
- **Subtasks**: [total count]
- **Phases**: [phase count]
- **Parallel limit**: [spec.parallelLimit from config, default 4]

### Subtask Manifest
| ID | File | Subagent | Dependencies | Phase |
|----|------|----------|-------------|-------|
| 01 | subtask-01-...-yyyymmdd.md | generalPurpose | — | 1 |
| 02 | subtask-02-...-yyyymmdd.md | generalPurpose | — | 1 |
| 03 | subtask-03-...-yyyymmdd.md | generalPurpose | 01, 02 | 2 |
| 04 | subtask-04-...-yyyymmdd.md | generalPurpose | 03 | 3 |
```

Then call `askQuestion` with:
```json
{
  "title": "Spec Execution Confirmation",
  "questions": [{
    "id": "confirm_execution",
    "prompt": "Proceed with execution of [N] subtasks across [M] phases?",
    "options": [
      { "id": "yes", "label": "Yes — begin execution" },
      { "id": "no", "label": "No — cancel" }
    ]
  }]
}
```

**CRITICAL**: Always use `askQuestion` for user gates — never plain-text `[Yes / No]` prompts.

### Step 2b: Record Start Time

Immediately after the user confirms execution, capture the start timestamp by running `date -u '+%Y-%m-%d %H:%M:%S UTC'`. Store this value for the execution report.

### Step 3: Execute Subtasks

Read `spec.parallelLimit` from `.zoto/spec-system/config.yml` (default **4**). Use it as the maximum number of subagents running at once for a phase.

For each phase in order:

1. **Spawn the subagent listed in the manifest** for each subtask in the current phase (up to `spec.parallelLimit` in parallel). The subagent type comes from the manifest's Subagent column — do not override or reassign. The manifest is the single source of truth for agent assignment
2. **Provide each subagent** with:
   - The full subtask file content (read from the File column path)
   - Any relevant context from the spec index (key decisions, requirements)
   - Status file pair (paths from the prompt prefix from subtask 04). Subagent must own these per the Status File Ownership section.
   - **TodoWrite instructions (mandatory)**: On spawn, the agent MUST immediately use `TodoWrite` to create a structured todo list from the subtask's Deliverables Checklist and Definition of Done:
     - One todo per Deliverables Checklist item (ids: `D01`, `D02`, ...)
     - One todo per Definition of Done item (ids: `DoD01`, `DoD02`, ...)
     - Set first actionable item to `in_progress`, others to `pending`
     - Mark each `completed` as work progresses; advance next to `in_progress`
     - This provides real-time progress visibility alongside the durable status.yml tracking
   - **Checklist tracking instructions**: As the agent works, it MUST also update the subtask file in place:
     - Tick each **Deliverables Checklist** item (`- [ ]` → `- [x]`) immediately after completing that deliverable
     - Tick each **Definition of Done** item (`- [ ]` → `- [x]`) as the corresponding quality gate is satisfied (e.g. code implemented, tests added, no linter errors)
     - Both sections must be fully checked before the agent reports completion
   - Instructions to record files modified and any blockers in Execution Notes
3. **Wait for all phase subtasks** to complete before starting the next phase

If a phase has more subtasks than `spec.parallelLimit`, batch them (N at a time per config) and wait for each batch before the next.

### Status File Ownership

Every spawned subagent owns its `.status.yml` + `.status.md` pair. The executor never writes to a subtask's `.status.yml` after spawning (the aggregator only reads); the subagent's own writes are the truth.

- Each spawned subagent receives the **prompt prefix** from subtask 04, which lists the absolute paths to its paired `.status.md` and `.status.yml`. The subagent **owns** these files for the duration of execution.
- **Heartbeat protocol**: At start, write `state: in_progress`, set `started_at` to now, set `last_heartbeat` to now. After every checklist tick or artifact write, update `last_heartbeat`. On completion, set `completed_at` and finalise `state` (`completed | blocked | failed`).
- **Checklist updates**: Ticking is performed by editing the `.status.yml` (`checklist[].done = true`, optionally `checklist[].evidence_path = "<file path>"`) and re-running `spec-status-roundtrip md-from-yml --in <that.yml> --out <that.md>` to refresh the `.status.md`. The recommended path is to use the `heartbeat` subcommand (`pnpm --filter @zoto-agents/zoto-spec-system run spec-status-roundtrip -- heartbeat --in <path>.status.yml ...`), which atomically validates against the schema and re-renders the paired `.status.md`. Agents are explicitly told **not** to edit the markdown directly during execution — yml is authoritative.
- **Artifacts**: Every file the subagent creates / modifies / deletes is recorded in `artifacts[]` with `kind: created | modified | deleted` and a short `note`.
- **Errors and blockers**: Structured errors land in `errors[]` with `severity: info | warn | error`. A subagent that cannot proceed (for example an external dependency unavailable) sets `state: blocked`, records the reason as a `severity: error` entry, and exits — the aggregator promotes the entry into the spec-root `blockers[]`.
- **Completion contract**: A subagent must not report Verified / Done unless `state: completed` AND every `checklist[].done` is true.

### Spec-Root Aggregation

The executor backgrounds **`spec-aggregator --watch`** (see `plugins/zoto-spec-system/docs/aggregator.md`) for the spec directory. That process is the **only** writer of the spec-root **`status.md`** + **`status.yml`** — started by the executor, tracked by PID, stopped with **SIGINT**/SIGTERM on cancellation.

- **Digest-based skip**: the aggregator recomputes a digest from each subtask `status/*.status.yml` and the spec index contents (UTF-8 SHA-256 per file, sorted by path) plus the live-reloadable config subset; if unchanged, it **does not rewrite** the spec-root files (no useless churn).
- **CLI modes** (all through `tsx scripts/spec-aggregator.ts` with `--repo-root`):
  - **`--watch`** — default during execution: poll + reload config each iteration.
  - **`--once`** — one-shot rebuild for dashboards or `--resume` flows.
  - **`--validate-only`** — CI gate: no spec-root writes; non-zero exit if any subtask source fails validation.

### Step 4: Adversarial Verification (per subtask) — mandatory

After each subtask's assigned agent completes, spawn a **fresh `zoto-spec-judge` subagent** to adversarially verify the work. This is a dedicated judge agent — it did not execute the subtask and has no bias toward the implementation. Run the judge as a **background subagent** so verification can proceed while the next phase's subtasks are being prepared.

#### Reviewer Non-Interference Contract (HARD RULE)

**Reviewer agents must never interfere with subtask work.** This contract has two halves:

1. **The judge writes only to the status pair.** The judge MUST NOT modify any subtask deliverable (source, test, config, doc), the subtask spec markdown, the spec index, the execution report, or the spec-root `status.{md,yml}`. The only files the judge writes to in Mode 1 are `<specDir>/status/<subtask>.status.yml` and the paired `.status.md` (and the markdown only via `spec-status-roundtrip md-from-yml`). See `plugins/zoto-spec-system/agents/zoto-spec-judge.md` → "Reviewer Non-Interference Contract".
2. **The executor never authors fixes from a fix-list.** When the judge returns `Partial` or `Failed`, the verdict carries a structured `extra.judge.fix_list` in the status yml. The executor MUST route each fix back to the **originally-assigned subagent** by re-spawning that exact subagent type (from the manifest's Subagent column) with the fix-list as input. The executor never edits deliverables itself, even for "trivial" or "mechanical" gaps — single-owner provenance per deliverable is the invariant.

#### Per-subtask verification workflow

For each completed subtask, the adversarial verifier must:

1. **Create a TodoWrite checklist** from the subtask's Deliverables Checklist and Definition of Done items (ids: `verify-D01`, `verify-D02`, ..., `verify-DoD01`, ...). Mark each `in_progress` as it is being verified, then `completed` when confirmed or note the gap.
2. **Read the subtask file** — both the **Deliverables Checklist** and the **Definition of Done** (read-only)
3. **Read the paired `.status.yml`** for the live execution record. **Live truth during execution is the `.status.yml`**; the subtask markdown file remains the long-form brief.
4. **Inspect every deliverable**: For each Deliverables Checklist item, verify the deliverable actually exists and is correct; **cross-check** each `checklist[].done: true` row in `.status.yml` against real filesystem and git state — if yml claims done but evidence is missing, treat that as a failure to verify.
   - Files listed as created → verify they exist and have expected content
   - Code changes → verify they build or typecheck as appropriate for the project; **check for linter errors on modified files**
   - Tests added → verify test files exist and are syntactically valid
   - Config changes → verify structured config is valid and references resolve
5. **Inspect every Definition of Done item**: For each quality gate, verify it is genuinely satisfied:
   - "Code implemented" → confirm the code exists and is functional
   - "Tests added" → confirm tests exist and cover the stated functionality
   - "No linter errors" → run linter checks on modified files and confirm clean
   - Any other DoD items → verify against the actual project state
6. **Reconcile checklist state inside the status pair only** (never the subtask spec markdown, never the spec index): tick `checklist[].done = true` for items confirmed against disk, untick `checklist[].done = false` for items the executing agent claimed but the verifier cannot confirm. Re-render the paired `.status.md` via the round-trip helper. Use the `heartbeat` subcommand for tick reconciliation; for `extra.judge` use a validated YAML merge followed by `md-from-yml`.
7. **Write verdict and structured `fix_list` into `extra.judge` of the same `.status.yml`**:

   ```yaml
   extra:
     judge:
       verdict: "verified" | "partial" | "failed"
       at: <iso-8601>
       notes: <string>
       fix_list:
         - item: "<deliverable id or short label>"
           gap: "<what is missing or wrong>"
           recommended_path: "<file or area the assigned subagent should touch>"
           severity: "blocker" | "should_fix" | "nice_to_have"
   ```

   Re-render `.status.md` via `spec-status-roundtrip md-from-yml`. The judge MUST NOT modify any file the `fix_list` points at — that is the assigned subagent's territory.
8. **Report verdict**: Return one of:
   - **Verified** — all Deliverables Checklist AND Definition of Done items confirmed; `fix_list` empty
   - **Partial** — some items incomplete (populate `fix_list`; list which from both sections)
   - **Failed** — critical deliverables missing or DoD items unsatisfied (populate `fix_list` with at least one `severity: blocker`)

#### Executor handling of judge verdicts

After adversarial verification, the **executor** (not the judge) reconciles the spec index and routes any required fixes:

- **Verified** → set the index manifest Status column to `Done`. Continue to the next phase.
- **Partial** → set Status to `Partial`. Report the structured `fix_list` to the user. Use **`askQuestion`** to present the three-way choice:
  ```json
  {
    "title": "Subtask [ID] — Partial Verdict",
    "questions": [{
      "id": "partial_action",
      "prompt": "[Summary of fix_list gaps]. How should we proceed?",
      "options": [
        { "id": "respawn", "label": "Re-spawn assigned subagent to address fix-list (recommended)" },
        { "id": "accept", "label": "Accept as-is and continue" },
        { "id": "abort", "label": "Abort execution" }
      ]
    }]
  }
  ```
  **The executor MUST NOT edit deliverables itself.**
- **Failed** → set Status to `Failed`, stop dependent subtasks. Use **`askQuestion`** with the same three options (default to re-spawning the originally-assigned subagent).

When re-spawning the originally-assigned subagent to address a `fix_list`:

1. Use the **same Subagent type** listed in the manifest's Subagent column — never substitute or upgrade. Single-owner provenance is the invariant.
2. Pass the structured `fix_list` items verbatim along with the subtask file and the status pair paths.
3. Require the re-spawned subagent to update its own status pair (heartbeat → tick fixes → finalize state) per the Status File Ownership section.
4. After the re-spawn completes, spawn a **fresh** `zoto-spec-judge` (different process from the prior judge) to re-verify the same subtask end-to-end.

**The adversarial verifier must be a `zoto-spec-judge` instance, not the agent that executed the subtask.** Independent validation is required for every subtask, including any re-verification after a fix-list round-trip.

### Step 5: Final Verification

After all phases complete and all subtasks have been adversarially verified:

1. **Confirm all subtasks are `Done`**: Every row in the manifest must have status `Done`. If any are `Partial` or `Failed`, use **`askQuestion`** to present the situation and ask how to proceed before continuing
2. **Verify and tick spec-level Definition of Done**: Read the spec index's `## Definition of Done` section. For each item, verify it against the actual project state (grep for keywords, check file existence, inspect deliverables, etc.). Tick each confirmed checkbox (`- [ ]` → `- [x]`) in the spec index. The aggregator mirrors these checkboxes into `definition_of_done_status` in the spec-root `status.yml` — unticked items will be flagged as critical by the onStop consistency check. **Do not skip this step** — it is the only mechanism that populates the spec-root DoD status.
3. **Run tests**: Run the **project's test suite** (use the repository's standard test command, or what the spec index documents). Prefer a `shell` subagent if your environment routes heavy commands that way
4. **Linter**: **Check for linter errors on modified files** (all files touched during execution)
5. **Quality audit**: Spawn a **fresh `zoto-spec-judge` subagent** for a concise quality audit of changed areas (correctness, consistency with project conventions, obvious security or reliability issues)
6. **Documentation**: **Update documentation if needed** when behavior, public APIs, or user-facing flows changed — no dedicated doc agent is assumed
7. **onStop consistency check (mandatory)** — see Step 5b below

### Step 5b: onStop Consistency Check (mandatory)

Before writing the execution report, every spec-execute and review agent runs a final consistency sweep over the live status pairs and config files. The check is a hard gate — if it exits non-zero, the executor must address the critical inconsistencies before declaring completion.

```
pnpm exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --repo-root <repoRoot>
```

What it does:

| Layer | Check | Auto-fix |
|-------|-------|----------|
| Subtask `.status.yml` | Schema validation against `subtask-status.schema.json` | None — schema-invalid yml is critical and must be authored back through the assigned subagent |
| Subtask `.status.md` | (a) parses cleanly, (b) every `D**` checkbox in md matches `checklist[].done` in yml, (c) regex sweep `^\s*- \[ \] \*\*(D\d+)\*\*` against md to backstop any unchecked-box that yml claims done | Re-renders md from yml via the existing round-trip helper (yml authoritative) |
| Subtask `.status.yml` logical state | `state: completed` and `extra.judge.verdict: verified` MUST imply every `checklist[].done === true` | None — critical; route back to the originally-assigned subagent for resolution |
| Spec-root `status.yml` | Schema validation against `spec-status.schema.json` | None — the aggregator owns this file; the next aggregator tick rebuilds it |
| Spec-root `status.yml` DoD | When `aggregate_state: completed`, every `definition_of_done_status[].done` MUST be `true` | None — critical; the executor must tick the spec index `## Definition of Done` checkboxes (Step 5 item 2) and trigger an aggregator rebuild |
| `.zoto/spec-system/config.yml` | Schema validation against `config.schema.json` | None — surface as critical |

Exit codes:
- `0` — clean, or every issue was auto-fixed
- `2` — at least one critical issue remains (do NOT advance past Step 5b)

The Cursor `stop` event hook (`hooks/zoto-onstop-check.mjs`) runs the same library on every agent stop as a defence-in-depth backstop — so even if an agent exits without invoking the CLI directly, the consistency sweep still runs.

This requirement applies to:
- The executor (`zoto-spec-executor`) before presenting the report
- Every adversarial judge (`zoto-spec-judge`) before reporting `verified`
- Any "review" subagent the executor spawns for the final quality audit

### Step 6: Write Execution Report

Write a persistent execution report in the spec directory as `execution-report-[feature-name]-[yyyymmdd].md`. This is a durable record of the execution — not only a chat summary.

Before writing the report, capture the end timestamp by running `date -u '+%Y-%m-%d %H:%M:%S UTC'`. Calculate the duration from the start timestamp recorded in Step 2b.

```markdown
# Execution Report: [Feature Name]

**Spec**: `spec-[feature-name]-[yyyymmdd].md`
**Started**: [YYYY-MM-DD HH:MM:SS UTC]
**Completed**: [YYYY-MM-DD HH:MM:SS UTC]
**Duration**: [Xm Ys]
**Status**: Completed | Completed with exceptions

## Summary

[1-3 sentence overview of what was accomplished]

## Subtask Results

| ID | Subtask | Subagent | Verification | Files Modified | Notes |
|----|---------|----------|-------------|----------------|-------|
| 01 | [name] | generalPurpose | Verified | [count] | [brief note] |
| 02 | [name] | generalPurpose | Verified | [count] | [brief note] |
| 03 | [name] | generalPurpose | Verified | [count] | [brief note] |

## Verification Results

### Adversarial Verification
- Subtasks verified: [N/N]
- Issues found during verification: [count]
- Issues resolved: [count]

### Test Suite
- Status: [PASS / FAIL]
- Tests run: [count]
- [details if failures]

### Linter
- Status: [CLEAN / N errors]
- [details if errors]

### Quality Audit
- Status: [PASS / WARN / FAIL]
- [findings if any]

### Documentation
- Status: [Updated / No changes needed / Skipped]
- [files updated if any]

## Files Modified (all subtasks combined)

[Deduplicated list of all files created or modified across all subtasks]

## Outstanding Items

- [Any items requiring manual follow-up]

## Lessons Learned

[Optional: blockers encountered, unexpected issues, process improvements]
```

### Step 7: Final Review

Present the execution report summary in your response text, then use **`askQuestion`** for structured approval:

```json
{
  "title": "Spec Execution Complete",
  "questions": [{
    "id": "approve_completion",
    "prompt": "Execution report written to {specsDir}/[directory]/execution-report-[feature-name]-[yyyymmdd].md. All [N] subtasks verified. Tests: [status]. Linter: [status]. Approve and mark spec as Completed?",
    "options": [
      { "id": "approve", "label": "Approve — mark spec as Completed" },
      { "id": "reject", "label": "Reject — review issues before completing" }
    ]
  }]
}
```

Replace `{specsDir}` with the configured value (e.g. `specs`).

### Step 8: Mark Complete

After user approval:

1. Update the spec index status to `Completed`
2. Fill in final execution notes in the index
3. Report completion

## Execution Rules

### Dependency Management

- Never start a subtask before all its listed dependencies are complete
- If a dependency fails, stop and report — do not continue with dependent subtasks
- Independent subtasks within a phase may run in parallel

### Parallel Limits

- Maximum concurrent subagents = `spec.parallelLimit` from `.zoto/spec-system/config.yml` (default **4**)
- If a phase has more subtasks than that limit, batch them and wait for each batch before the next

### Error Handling

- If a subtask fails, update its status in the index and report to the user
- Use **`askQuestion`** to present structured options: retry, skip, or abort the spec
- Never silently skip a failed subtask

### Progress Updates

- Update the index file after each subtask completes (not just at the end)
- Include: subtask status, files modified, any blockers, time taken
- Keep the user informed between phases

### Testing During Execution

- Individual subtasks should only run **targeted** tests on files they modified
- The **full project test suite** runs only during the final verification phase
- This reduces interference from parallel file modifications

## Resuming Execution

If execution is interrupted (e.g. session ends):

1. Read the spec index to determine which subtasks are complete
2. Identify the next incomplete subtask based on the dependency graph
3. Resume from that point — do not re-execute completed subtasks
4. Verify completed subtask deliverables still hold (files exist, no regressions)

## What NOT to Do

- Do not modify code files directly — only subagents modify code. **This applies even when the modification looks small or "mechanical"** — a one-line typo fix from a judge fix-list still routes through a re-spawn of the originally-assigned subagent. Single-owner provenance per deliverable is non-negotiable.
- Do not let a judge (or any reviewer) write to anything outside the `<specDir>/status/<subtask>.status.{md,yml}` pair during Mode 1. Reviewer non-interference is a hard rule (see Step 4).
- Do not "promote" a fix-list item to executor-direct work. Always re-spawn the manifest-listed subagent for that subtask.
- Do not skip the user confirmation step before starting execution — **always use `askQuestion`** for user gates, never plain-text `[Yes / No]` prompts
- Do not use free-form chat to request user decisions — all choices must go through **`askQuestion`** (executor/commands) or **`needs_user_input`** (subagents/skills)
- Do not run the **full** project test suite during parallel subtask execution
- Do not mark a subtask complete if any Deliverables Checklist or Definition of Done item is unchecked
- Do not continue past a failed dependency without user approval
- Do not skip **adversarial verification** for any subtask
- Do not create auxiliary knowledge-base or memory artifacts from spec execution unless the repository explicitly enables a memory extension for this workflow
