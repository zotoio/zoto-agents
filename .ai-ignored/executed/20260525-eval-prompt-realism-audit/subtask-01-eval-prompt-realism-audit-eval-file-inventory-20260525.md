# Subtask: Eval-file inventory & schema map

## Metadata
- **Subtask ID**: 01
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: explore
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: None
- **Created**: 20260525

## Objective

Enumerate every in-scope eval JSON file in the monorepo, classify its container shape and per-case `_meta.generated` split, and reconcile the enumeration against `.zoto/eval-system/manifest.yml` so subsequent subtasks have a single trusted map of what they are auditing.

## Deliverables Checklist
- [x] `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.md` — human-readable table per scope bucket (eval-system commands / eval-system agents / eval-system hooks / eval-system skills / spec-system commands / spec-system agents / spec-system hooks / spec-system skills / cursor-top skills / workspace `.cursor/evals` / workspace `.cursor/skills`).
- [x] `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.json` — machine-readable mirror keyed by `path` → `{ container_shape: "cases[]" | "evals[]" | "mixed", target_id?: string, case_count_generated: number, case_count_user_authored: number, manifest_listed: boolean }`.
- [x] Manifest reconciliation diff — list any in-scope file the manifest does not list, and any manifest `eval_files[]` entry that points at a missing file (zero of either is the expected outcome).
- [x] Per-target case-count totals (rows: target kind; columns: generated, user-authored, total) appended to `eval-inventory.md`.

## Definition of Done
- [x] Every eval JSON under the in-scope roots is enumerated; the file count matches `git ls-files | grep -E "(evals/(commands|agents|hooks)/[^/]+\.json|evals/evals\.json)"` modulo `evals/fixtures/`.
- [x] Container shape and `_meta` split is recorded per file with no `null` values.
- [x] Manifest reconciliation reports zero missing-from-manifest and zero broken-pointer entries OR every discrepancy carries an explicit explanation (e.g. `evals/fixtures/baseline/package.json` is a fixture, not an eval file).
- [x] No code files outside `specs/20260525-eval-prompt-realism-audit/` are modified.

## Implementation Notes

In-scope roots (audit only — fixtures excluded):

- `plugins/zoto-eval-system/evals/commands/*.json`
- `plugins/zoto-eval-system/evals/agents/*.json`
- `plugins/zoto-eval-system/evals/hooks/*.json`
- `plugins/zoto-eval-system/skills/*/evals/evals.json`
- `plugins/zoto-spec-system/evals/commands/*.json`
- `plugins/zoto-spec-system/evals/agents/*.json`
- `plugins/zoto-spec-system/evals/hooks/*.json`
- `plugins/zoto-spec-system/skills/*/evals/evals.json`
- `plugins/zoto-cursor-top/skills/*/evals/evals.json`
- `.cursor/evals/commands/*.json`
- `.cursor/evals/agents/*.json`
- `.cursor/evals/hooks/*.json`
- `.cursor/skills/zoto-create-plugin/evals/evals.json`

Out of scope (do **NOT** include):
- `evals/fixtures/**` (these are pytest fixtures used by the static backend, not eval suites).
- Any `_runs/` artefact (these are execution outputs, not source).

Container shape heuristic:
- `cases[]` shape: top-level `target_id` plus `cases[]` (every central plugin eval JSON for commands / agents / hooks).
- `evals[]` shape: top-level `skill_name` (or `command_name`) plus `evals[]` (the older per-skill format, some workspace files).
- `mixed`: file contains BOTH a low-id `evals[]` block of user-authored cases (no `_meta`) AND a high-id `cases[]`-style or duplicate-id `evals[]`-style block of `_meta.generated: true` rows (notably `plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json`).

Per-case `_meta` classification rule (mirror runtime guard in `plugins/zoto-eval-system/engine/_user-case-guards.ts`):
- generated iff `_meta?.generated === true`; otherwise user-authored.

Manifest reconciliation source: `.zoto/eval-system/manifest.yml` `targets[].eval_files[]`.

This subtask is read-only — use `explore`-style searches and the `Read` tool only. Do not modify any file outside the spec audit directory.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `pnpm run eval:list` (read-only) to cross-check the manifest's target list against your enumeration.

No targeted test additions are required for this subtask — its deliverables are inventory artefacts, not code.

## Execution Notes

### Agent Session Info
- Agent: explore (fix-list writer)
- Started: 2026-05-25
- Completed: 2026-05-25

### Work Log
- Re-verified 48 in-scope eval JSON files against on-disk content and `.zoto/eval-system/manifest.yml`.
- Totals: 299 cases (258 generated, 41 user-authored); shapes 30 `cases[]`, 8 `evals[]`, 10 `mixed`.
- Manifest: 47 `eval_files[]` entries; 0 broken pointers; 1 missing (`zoto-cursor-top-monitor`, documented for Subtask 09).
- Wrote `audit/eval-inventory.md` and `audit/eval-inventory.json`.

### Blockers Encountered
_None._

### Files Modified
- `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.md` (created)
- `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.json` (created)
- `specs/20260525-eval-prompt-realism-audit/status/subtask-01-*.status.{yml,md}` (updated)
- `specs/20260525-eval-prompt-realism-audit/subtask-01-*.md` (checkboxes)
