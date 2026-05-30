# Subtask: Scaffold `status/` Pair Per Subtask in `zoto-create-spec`

## Metadata
- **Subtask ID**: 05
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02
- **Created**: 20260506

## Objective

Update the `zoto-create-spec` skill (and the `zoto-spec-generator` agent doc) so every newly created spec directory ships with a fully scaffolded `status/` subdirectory: one **paired pair** of `.status.md` + `.status.yml` per subtask, populated from the subtask's Deliverables Checklist via the round-trip helper. Also add the round-trip helper script.

## Deliverables Checklist

### Round-trip helper
- [ ] `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts` — `tsx` CLI with sub-commands:
  - `spec-status-roundtrip md-from-yml --in <path>.status.yml --out <path>.status.md` — renders the md from the yml using the block-marker template (subtask 02's `templates/status/subtask-status.md.tmpl`)
  - `spec-status-roundtrip yml-from-md --in <path>.status.md --out <path>.status.yml` — parses block markers, reconstructs the yml, validates against `subtask-status.schema.json`
  - `spec-status-roundtrip scaffold --spec-dir <dir>` — for every `subtask-NN-...md` in the spec directory, generate the paired `status/subtask-NN-....status.{md,yml}` if missing; preserve existing files as-is (idempotent)
  - `spec-status-roundtrip validate --spec-dir <dir>` — validate every `status/*.status.yml` in the directory against `subtask-status.schema.json`; non-zero exit on any failure
- [ ] `plugins/zoto-spec-system/scripts/spec-status-roundtrip.test.ts` — vitest unit tests:
  - md → yml round trip preserves checklist IDs, text, and ticked state
  - yml → md round trip places the right text inside each block marker
  - scaffolding from a fixture spec directory creates the expected files (count + paths)
  - scaffolding is idempotent — running twice does not overwrite an existing `.status.md` whose mtime is newer than the yml
  - validate fails (non-zero) on a malformed yml fixture

### Skill / agent updates (text-only)
- [ ] `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md` — extend Step 6 (Create Spec Files) to add a sub-step:
  - **Step 6.4 — Scaffold status pair per subtask**: After writing the index and subtask files, run `pnpm --filter @zoto-agents/zoto-spec-system exec spec-status-roundtrip scaffold --spec-dir {specsDir}/<spec>` to generate one paired `.status.md` + `.status.yml` per subtask. Each scaffolded `.status.yml` starts with `state: pending`, no `started_at`, an empty `errors[]` and `artifacts[]`, and a `checklist[]` derived from the subtask file's Deliverables Checklist (each item gets a stable `id` like `D01`, `D02`, ...).
- [ ] `plugins/zoto-spec-system/agents/zoto-spec-generator.md` — update the Spec Directory Structure block to show the new layout:
  ```
  {specsDir}/
  └── [yyyymmdd]-[feature-name]/
      ├── spec-[feature-name]-[yyyymmdd].md
      ├── subtask-NN-...md
      ├── status/
      │   ├── subtask-NN-...status.md
      │   └── subtask-NN-...status.yml
      ├── status.md          (aggregator output)
      └── status.yml         (aggregator output)
  ```
  Add a one-line callout that the executor's aggregator (subtask 07) creates the spec-root `status.md` + `status.yml`; the generator only scaffolds the per-subtask pair.
- [ ] `plugins/zoto-spec-system/commands/zoto-spec-create.md` — append a row to the "What happens" list: `5. Scaffold {specsDir}/<spec>/status/ with one paired .status.md + .status.yml per subtask, populated from the Deliverables Checklist.`

### Eval seed (skill-level eval lives next to the skill)
- [ ] `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` — add **one new eval case** (do not delete existing cases):
  - Prompt: a free-text request to create a 3-subtask spec
  - Assertions include: `Spec directory contains a status/ subdirectory`, `Each subtask has a paired .status.md and .status.yml`, `Every .status.yml validates against subtask-status.schema.json`, `Every .status.yml starts with state: pending and a checklist derived from the Deliverables Checklist`

## Definition of Done
- [ ] Helper CLI exists and all four sub-commands work end-to-end on a fixture spec
- [ ] Vitest unit tests pass: `pnpm --filter @zoto-agents/zoto-spec-system test scripts/spec-status-roundtrip.test.ts`
- [ ] Skill and agent docs reflect the new scaffolding step and directory layout
- [ ] The new eval case is added to the skill's `evals.json`
- [ ] Running the helper twice on the same directory is idempotent (asserted by the test)
- [ ] No linter errors in modified files

## Implementation Notes

- The round-trip helper is the **single source of truth** for the binding. Do not duplicate the marker-parsing logic anywhere else.
- Use `yaml@^2` (matches the eval-system's existing `import YAML from "yaml"` pattern; added in subtask 03) for yml read/write. Do **not** introduce `js-yaml` — the repo standard is `yaml`.
- The scaffolding sub-command must be **idempotent**: if `status/subtask-NN-...status.md` already exists with a newer mtime than the yml, leave it alone. Otherwise, regenerate the md from the yml (yml is authoritative). Existing yml files are never overwritten by scaffold.
- Stable checklist IDs (`D01`, `D02`, ...) are derived in deliverable order from the subtask file's `## Deliverables Checklist` section. Subtask 02's schema requires the IDs.
- Use `pnpm` for all package management; the user's `yarn` preference does not apply inside this `pnpm`-based monorepo (call this out in the work log).
- Keep the skill update narrow — Step 6 already exists; this subtask only adds Step 6.4. Do not rewrite the surrounding workflow.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run only the new helper test file
- Run only the create-spec skill eval against the freshly scaffolded fixture
- Defer the full repo test suite to subtask 08

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: crux-software-engineer
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
