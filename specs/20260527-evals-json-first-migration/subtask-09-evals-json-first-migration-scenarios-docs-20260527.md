# Subtask: Scenario Scaffold + Documentation + CHANGELOG

## Metadata
- **Subtask ID**: 09
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 07
- **Created**: 20260527

## Objective

Ship the `evals/scenarios/` convention end-to-end: add the canonical example file, wire it into the `/z-eval-create` scaffold, update the eval-system README and `zoto-help-evals` skill to document the new flow, and record the breaking changes in CHANGELOG files.

## Deliverables Checklist
- [ ] Create the example scenario as a **template** (not a live file in this repo) at `plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl`:
    - First line: `// _meta.generated: false  (hand-edit this scenario)`
    - Uses `describe.skip("Example multi-primitive scenario", () => { xit("...", async () => { ... }); });`
    - File is prefixed with underscore and excluded via an explicit `evals/scenarios/_*` entry in the Vitest config's `exclude` array (Vitest does NOT exclude underscore-prefixed files by default); users opt-in by removing the underscore prefix.
    - Imports `RunnerParams` / `defineLlmEval` types where helpful so the IDE highlights the contract.
    - Body comments walk through how to drive a multi-primitive flow (call command A → assert agent B output → check side-effect).
    - Trailing comment block linking to the README section.
- [ ] Add a host-repo install hook so `/z-eval-create` copies the template:
    - Update `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` so its create-flow includes a step "Copy example scenario template to `<repo>/evals/scenarios/_example-multi-primitive.test.ts`".
    - The example is scaffolded into `evals/scenarios/` on generation — this is the canonical sample location for advanced TS evals. The underscore prefix excludes it from Vitest discovery via an explicit `evals/scenarios/_*` entry in the Vitest config's `exclude` array; removing the prefix opts in.
    - Update `scripts/eval-ensure-host.ts` (the confirmed host-repo bootstrapper) to perform the copy when scaffolding a new repo.
    - Make the copy idempotent: skip if the destination already exists.
- [ ] Update `plugins/zoto-eval-system/README.md`:
    - Add a top-level section "Eval formats" describing the two case types — declarative JSON and runner JSON.
    - Add a sub-section "Advanced TS escape hatch (`runner` cases)" with:
        - Motivation (when basic JSON evals are insufficient).
        - The `RunnerParams` interface signature.
        - A concrete JSON snippet:
            ```json
            {
              "id": "complex-flow",
              "runner": "./complex-flow.test.ts",
              "parameters": { "scenarioVariant": "happy-path" }
            }
            ```
        - The matching TS file outline.
    - Add a sub-section "Multi-primitive scenarios" pointing at `evals/scenarios/<name>.test.ts` and referencing the example file.
    - Add a "Migration notes" sub-section with a one-paragraph summary of the breaking change.
- [ ] Update `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`:
    - Replace any reference to `.test.ts` LLM evals with the new JSON flow.
    - Add a Q&A entry: "How do I write a TS eval?" → "Use a `runner` case in your JSON eval (see README), or add a multi-primitive scenario under `evals/scenarios/`."
- [ ] Update `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json`:
    - Add an eval that asserts the help skill answers correctly when the user asks about the `runner` escape hatch (≥1 new case with assertions referencing the new README section). Skill evals stay JSON per Cursor spec — this is purely additive content.
- [ ] Update `plugins/zoto-eval-system/CHANGELOG.md`:
    - New entry at the top dated 2026-05-27 with a `BREAKING:` prefix.
    - Bullet list:
        - All non-skill primitive evals now stored as `.json` instead of `.test.ts`.
        - New `runner` + `parameters` case shape documented.
        - `eval:llm` script removed; the unified `evals/vitest.config.ts` handles everything.
        - Migration script `scripts/eval-migrate-ts-to-json.ts` runs idempotently for any latecomers.
- [ ] Update the repo-root `CHANGELOG.md` with a brief pointer to the eval-system plugin entry.
- [ ] Update `AGENTS.md` only if it currently describes the TS-eval convention; otherwise leave untouched. Grep for `\.test\.ts` mentions related to evals.
- [ ] Update any other plugin README / skill doc that references the TS LLM eval convention:
    - `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`
    - `plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md`
    - `plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md`
    - Grep for `\.test\.ts` mentions across `plugins/zoto-eval-system/**/*.md` and fix each one as appropriate.

## Definition of Done
- [ ] Example scenario template exists at `plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl`.
- [ ] `/z-eval-create` scaffold copies the example into the host repo at `evals/scenarios/_example-multi-primitive.test.ts` (underscore-excluded by default; opt-in by removing prefix).
- [ ] README has "Advanced TS escape hatch" and "Multi-primitive scenarios" sections with working examples.
- [ ] `zoto-help-evals` skill answers questions about the new flow.
- [ ] CHANGELOG entries land in both the plugin and repo-root files.
- [ ] No stale references to `.test.ts` LLM evals remain in `plugins/zoto-eval-system/**/*.md`.
- [ ] No linter errors in modified files (markdown lint clean, if configured).

## Implementation Notes

- **Template vs live file:** The example scenario MUST live as a `.tmpl` under `plugins/zoto-eval-system/templates/scenarios/` because we do not want a literal `_example-multi-primitive.test.ts` file in THIS repo's `evals/scenarios/` polluting Vitest discovery. The `.tmpl` is copied (renamed to drop `.tmpl`) only when a host repo runs `/z-eval-create`. The destination is `<repo>/evals/scenarios/_example-multi-primitive.test.ts` — the underscore prefix excludes it from Vitest by default; removing the prefix opts the file into test discovery.
- **Skill SKILL.md size:** Keep `SKILL.md` files under 500 lines (`zoto-plugin-conventions` rule). The README is the canonical long-form doc; skill files just point to it.
- **`/z-eval-create` plumbing:** Read the existing `zoto-create-evals` skill, then `scripts/eval-ensure-host.ts` (confirmed host bootstrapper). Add the scenario copy step idempotently.
- **Help-skill eval shape:** Skill `evals/evals.json` uses `{ "skill_name": ..., "evals": [...] }` — not `target_id`/`cases`. Do NOT confuse the two formats when adding the new case.
- **CRUX rule compliance:** Do not edit any `.crux.md` / `.crux.mdc` derived files. If the README has a CRUX-compressed twin, update the source first.
- **Grep first:** Before adding new content, run `rg "\.test\.ts" plugins/zoto-eval-system -g '*.md'` to find every doc reference. Fix every match.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Manually open the README and verify formatting renders.
- Run the help-skill eval locally (if `CURSOR_API_KEY` is available) to confirm the new case passes:
  - `pnpm exec vitest run --config evals/vitest.config.ts <path to help skill eval JSON, after subtask 06 wiring>`
- Skill eval files run via the existing declarative path; verify with:
  - `pnpm eval:list | grep zoto-help-evals`
- Defer full eval suite to subtask 10.

## Execution Notes

### Agent Session Info
- Agent: *(not yet assigned)*
- Started: *(not yet started)*
- Completed: *(not yet completed)*

### Work Log
*(Agent adds notes here during execution.)*

### Blockers Encountered
*(Any blockers or issues.)*

### Files Modified
*(List of files changed.)*
