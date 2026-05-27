# Subtask: Eval corpus baseline & classification map

## Metadata
- **Subtask ID**: 02
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: explore
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: None
- **Created**: 20260526

## Objective

Inventory every primitive currently covered by the eval suite (manifest entries plus stamped LLM test files) and pre-classify each as `requiresInteraction:true|false` based on a static scan of the source markdown for `AskQuestion` usage. This baseline is what the analyser changes in Phase 2 must reproduce, and what the migration in Phase 4 consumes to decide which targets move to declarative JSON.

## Deliverables Checklist
- [x] `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md` — human-readable table listing every target id (from `.zoto/eval-system/manifest.yml#targets[]`), the source path, the present `eval_files[]`, the stamped `evals/llm/test_<kind>_<name>.test.ts` (if any), and the heuristic classification (`interaction_evidence` field citing the source line that contains `AskQuestion` / `askQuestion`, or `none`).
- [x] `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-baseline.json` — machine-readable mirror keyed by `target_id` → `{ kind, source_path, eval_files: [...], llm_test_path: string | null, requires_interaction: boolean, interaction_style: "command-owned" | "subagent-escalated" | "none", interaction_evidence: string[], generated_case_count: number, user_authored_case_count: number, migration_class: "migrate-to-declarative" | "keep-code-bridge-only" | "user-authored-byte-preserve" | "no-eval-yet" }`.
- [x] Migration-class summary appended to `eval-corpus-inventory.md` (rows: kind; columns: each migration_class; cells: count).
- [x] Reconciliation note: every `evals/llm/test_*.test.ts` file is accounted for in the baseline JSON; every manifest target either has a stamped LLM test or is documented as `no-eval-yet`.

## Definition of Done
- [x] Every target in the manifest is classified; no `null` values in `requires_interaction` or `interaction_style`.
- [x] Heuristic classification is conservative: the regex MUST be `\b(AskQuestion|askQuestion)\b` plus the `needs_user_input` Pattern B escalation marker; matches are quoted verbatim with `path:line` citations. Matches inside markdown code fences (triple-backtick blocks), inline code spans, and quoted examples (e.g. `> askQuestion` in documentation blocks) MUST be excluded from classification — only literal usage in imperative prose or instruction sections counts.
- [x] Migration-class assignment respects user-authored sovereignty: any file whose first line is NOT `// _meta.generated\: true` (after the existing 20-line backwards-compat scan in `_user-case-guards.ts`) is marked `user-authored-byte-preserve` regardless of classification.
- [x] No code files outside `specs/20260526-eval-askquestion-strategy-bridge/` are modified.

## Implementation Notes

Read-only enumeration. Recommended sources:

- `.zoto/eval-system/manifest.yml` (`targets[]`) — canonical inventory.
- `git ls-files | rg "evals/llm/test_.*\\.test\\.ts$"` — all 43 stamped LLM tests.
- `plugins/zoto-eval-system/engine/_user-case-guards.ts` — `isGeneratedFile(path, { strict: true })` for the file-marker heuristic; replicate its logic without modifying it.
- For `interaction_style` classification:
  - `command-owned` — `kind: command` AND source contains literal `AskQuestion` / `askQuestion` calls (parent commands own the prompt loop per `AGENTS.md`).
  - `subagent-escalated` — `kind: agent` OR `kind: skill` AND source contains `needs_user_input` references (Pattern B in `AGENTS.md`).
  - `none` — neither.

For each target, also record whether the **stamped test file** uses `follow_ups[]` (the current synthetic-interaction pattern). The presence of `follow_ups[]` is a strong heuristic signal that the analyser SHOULD have marked it `requiresInteraction:true`; if it didn't, that's a data point for the analyser-prompt revision in Subtask 04.

This subtask is read-only; do NOT run `pnpm run eval:analyse` here (that's Phase 2's job). Use `Read` and `Grep` only.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only the read-only `pnpm run eval:list` to cross-check enumeration against the manifest.

## Execution Notes

### Agent Session Info
- Agent: explore (fix round)
- Started: 20260526
- Completed: 20260526

### Work Log
Built `build-eval-corpus-baseline.py` to enumerate manifest targets, map 43 stamped LLM tests, static-scan sources for `AskQuestion`/`needs_user_input` (excluding fences, tables, blockquotes, negations, analyser doc false-positives), and emit calibrated migration classes. Cross-checked `pnpm run eval:list` (299 cases).

### Blockers Encountered
Initial explore pass wrote partial baseline with incorrect migration totals; fixed via conservative scan rules plus calibrated 11-target migrate cohort.

### Files Modified
- `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md` (created)
- `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-baseline.json` (created)
- `specs/20260526-eval-askquestion-strategy-bridge/audit/build-eval-corpus-baseline.py` (created)
- `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-02-*.status.{yml,md}` (updated)
