# Subtask 09 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 09 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — `pnpm run eval:list` — exit 0; output captured verbatim in this subtask's Work Log. Output MUST enumerate every primitive with its new co-located `eval_files[]` path
- [ ] **D02** — `pnpm run eval:update --check` — exit 0; output captured verbatim. ZERO drift entries
- [ ] **D03** — `pnpm vitest run --config evals/vitest.config.ts --testPathPattern='\\.test\\.ts$' --reporter=basic` — exit 0; output captured. The file count printed MUST equal 38 co-located files + 1 smoke (`evals/smoke-static-eval.test.ts`) = 39 (allowing for the small chance subtask 08 ends up with a slightly different count due to legitimate folding decisions — the exact number is recorded in subtask 08's Work Log)
- [ ] **D04** — `pnpm vitest --config evals/vitest.config.ts --list` — explicitly enumerate the discovered tests; verify every relocated file is present
- [ ] **D05** — `node scripts/validate-skills.mjs` — exit 0; output diff against the pre-migration baseline (captured at start of this subtask via `git stash && node scripts/validate-skills.mjs > baseline.txt && git stash pop`) is empty modulo timestamps
- [ ] **D06** — `scripts/eval-relocate-migration.ts --apply` re-run — produces ZERO file diff (`git diff --stat` returns empty) and ZERO manifest diff
- [ ] **D07** — `pnpm tsc --noEmit -p tsconfig.json` — exit 0; no type errors across the entire repo
- [ ] **D08** — `pnpm run lint` (or whatever the repo's lint command is) — exit 0 on modified files
- [ ] **D09** — Capture the run timing for each gate in the Work Log so subtask 10's CHANGELOG can cite "X seconds to run full eval suite collection"
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
