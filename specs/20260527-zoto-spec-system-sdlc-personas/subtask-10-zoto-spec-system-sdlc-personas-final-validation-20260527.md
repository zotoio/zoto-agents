---
persona: zoto-test-engineer
---

# Subtask: Final validation — run repo-wide tests + validators, fix breakage

## Metadata
- **Subtask ID**: 10
- **Feature**: zoto-spec-system-sdlc-personas
- **Persona**: zoto-test-engineer
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 02, 03, 04, 05, 06, 07, 08, 09
- **Created**: 20260527

## Objective

Run the full validation suite required by the spec acceptance criteria, fix
anything that breaks, and verify every Definition of Done item from the spec
index. This is the only subtask in the spec that runs *repo-wide* test
commands — earlier subtasks intentionally restrict themselves to scoped
plugin tests to avoid noisy cross-subtask interference.

## Deliverables Checklist

- [ ] **D01** — Run `pnpm test` from the repo root. Capture results. Fix any
      failures introduced by this spec (do NOT fix unrelated pre-existing
      failures — flag them as blockers in the work log).
- [ ] **D02** — Run `node scripts/validate-template.mjs` from the repo root.
      Capture results. Fix any failures.
- [ ] **D03** — Run `node scripts/validate-skills.mjs` from the repo root.
      Capture results. Fix any failures.
- [ ] **D04** — Run `pnpm --filter @zoto-agents/zoto-spec-system test`
      (plugin-scoped) again to confirm scoped tests pass after the global
      run.
- [ ] **D05** — Validate a sample/fixture subtask markdown frontmatter
      against the new
      `plugins/zoto-spec-system/templates/schema/subtask-spec.schema.json`
      (subtask 01 D09). Two checks:
      1. Run an `ajv`-driven validation against the actual subtask files
         this spec ships in
         `specs/20260527-zoto-spec-system-sdlc-personas/subtask-*.md` —
         every one of the 9 subtasks MUST validate.
      2. Run a negative-case validation against a hand-crafted bad fixture
         (e.g. `persona: data-engineer` — Tier 2) and assert the schema
         rejects it with a helpful error.
      Capture both outputs in the work log. If a dedicated test for this
      flow exists from subtask 01 D10, run it here to confirm.
- [ ] **D06** — Verify each spec **Definition of Done** item is satisfied
      by visiting the relevant files:
      1. 10 persona agent files exist + each ≤ 200 lines (`wc -l`).
      2. 5 phase skill directories exist with `SKILL.md` (< 500 lines) +
         `evals/evals.json` (≥ 2 cases each).
      3. Executor reads `persona:` and dispatches via `--role persona-<name>`;
         missing/invalid fails loudly.
      4. Generator auto-assigns + confirms; judge enforces the contract.
      5. Smoke evals + dispatch integration test pass (re-run focused
         tests to confirm).
      6. README + CHANGELOG updated (CHANGELOG framed as `1.0.0` stability
         milestone); `package.json` and `.cursor-plugin/plugin.json` both
         at `1.0.0`.
      7. `pnpm test` + both validate scripts pass.
      8. No Tier 2 persona names appear outside the README Roadmap (run
         `rg -n 'data-engineer|ux-designer|a11y|performance|ml|migration|compliance|finops|release-manager' plugins/zoto-spec-system/`
         and confirm matches are README-only).
      9. No linter errors in modified files (run plugin lint command if
         it exists, otherwise `pnpm --filter @zoto-agents/zoto-spec-system run typecheck`
         + `pnpm --filter @zoto-agents/zoto-spec-system run lint` if those
         scripts exist).
- [ ] **D07** — Confirm DoD completion to the executor / aggregator. Do
      **NOT** edit the spec-index `Status` field directly — that field is
      owned by the executor and the spec-aggregator per the existing
      reviewer-non-interference contract. This subtask MAY append a
      one-line summary to the **Execution Notes** section of the spec
      index (which is co-authored, not owned by the aggregator), but MUST
      NOT touch the manifest, the Status field, or any per-subtask
      `.status.yml` outside of its own.
- [ ] **D08** — Append the spec's execution outcomes (test pass/fail
      counts, fixed issues, any deferred follow-ups) to a new
      **execution-report-zoto-spec-system-sdlc-personas-20260527.md** file
      under `specs/20260527-zoto-spec-system-sdlc-personas/`. (This
      filename is conventional for the spec system; the executor will
      typically write it for you, but capture any manual additions here.)

## Definition of Done
- [ ] `pnpm test` passes from the repo root.
- [ ] `node scripts/validate-template.mjs` passes.
- [ ] `node scripts/validate-skills.mjs` passes.
- [ ] `subtask-spec.schema.json` validates all 9 subtask files in this spec
      and rejects a hand-crafted Tier 2 negative case (D05).
- [ ] All spec DoD items in the index are satisfied.
- [ ] DoD-completion signalled to the executor / aggregator (one-line
      Execution Notes summary appended); spec-index Status transition is
      handled by the executor / aggregator, not by this subtask.
- [ ] No linter errors in modified files.

## Implementation Notes

- This subtask is intentionally **restricted to validation + targeted
  fixes**. If a previous subtask shipped broken code, prefer surfacing it
  as a blocker / re-spawn request rather than inventing scope. The
  executor's adversarial-verification flow (subtask 04 / executor agent)
  already supports re-spawning the original persona on failure.
- If `pnpm test` reveals failures **unrelated** to this spec (e.g. flaky
  tests in unrelated plugins), do NOT fix them here — log them in the
  work log and proceed. The spec scope is the persona feature only.
- The Tier 2 grep check is a load-bearing acceptance criterion: a single
  Tier 2 mention outside the README Roadmap must be flagged and removed.
- Follow `.cursor/rules/zoto-plugin-conventions.mdc` for the validation
  command list. If the rule documents additional validators (e.g.
  marketplace.json validation), include them here.
- Resist the urge to expand the spec. If a follow-up surfaces (e.g. a
  Tier 2 persona that the team now wants), record it in the execution
  report and propose a fresh spec — do not bolt onto this one.

## Testing Strategy

This subtask **is** the global test invocation point. Run the repo-wide
commands here:

- `pnpm test` (repo root)
- `node scripts/validate-template.mjs` (repo root)
- `node scripts/validate-skills.mjs` (repo root)
- `pnpm --filter @zoto-agents/zoto-spec-system test` (plugin scope)
- `rg` sweep for Tier 2 leakage

Capture every output in the work log so future audits can reconstruct the
final-validation evidence.

## Execution Notes
_(to be filled by the executing agent)_

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
