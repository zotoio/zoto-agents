# Subtask 09 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 09 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat | 2026-05-25T17:46:29.228Z |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `pnpm run eval:update --apply --with-analyser` invocation log captured under `audit/migration-update-log.txt`. The flag `--with-analyser` forces re-analyse of every cached payload (Subtask 04's version bump invalidated them all anyway). (`specs/20260526-eval-askquestion-strategy-bridge/audit/migration-update-log.txt`)
- [x] **D02** — Migration matrix at `audit/migration-matrix.md`: rows = each of the 43 stamped LLM tests + every manifest target without a stamped test; columns = pre-migration backend, post-migration backend, migration_class, file path before, file path after, diff-empty proof for user-authored rows. (`specs/20260526-eval-askquestion-strategy-bridge/audit/migration-matrix.md`)
- [x] **D03** — Eligible non-interactive primitives migrated: their `evals/llm/test_<kind>_<name>.test.ts` is removed (with `_user-case-guards.isGeneratedFile(path, { strict: true })` enforced first), and their case rows land in `plugins/<plugin>/evals/<kind>/<name>.json` with identical case payloads. Existing `_meta.generated: true` markers are preserved. (`specs/20260526-eval-askquestion-strategy-bridge/audit/migration-matrix.md`)
- [x] **D04** — Interactive primitives keep their `test_*.test.ts` file but switch to the new bridge import; existing case data is preserved verbatim except for the import line(s) added by Subtask 07's template change. (`specs/20260526-eval-askquestion-strategy-bridge/audit/stamp-code-bridge-result.json`)
- [x] **D05** — User-authored cases (no `_meta` or `_meta.generated !== true`, OR mixed-shape files) byte-identical pre-/post-migration; the matrix records a `git diff --stat` line per file proving zero byte change. (`plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json`)
- [x] **D06** — Mutual-exclusion guard from Subtask 06 not tripped by any production write (because the migration explicitly removes the opposite-backend artefact first). (`specs/20260526-eval-askquestion-strategy-bridge/audit/complete-routing-migration-result.json`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/migration-matrix.md` — 52-row migration matrix with counts and diff proofs
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/migration-git-status.txt` — git status porcelain capped to eval-related paths
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/migration-update-log.txt` — eval:update --apply --with-analyser stdout and stderr log
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/complete-routing-migration.ts` — baseline-driven declarative routing script
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/stamp-code-bridge.ts` — code-strategy bridge import stamper
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/complete-routing-migration-result.json` — per-target declarative migration results
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/stamp-code-bridge-result.json` — 32 keep-code-bridge stamp results
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Judge fix-list applied. D05 accepted: four user-authored skill evals.json restored via git checkout (compare-evals, create-spec, judge-spec byte-identical to HEAD). execute-spec has one accepted pre-existing JSON typo fix (`,]`→`]`, 1 insertion/1 deletion) because HEAD already carried invalid JSON; matrix row documents this exception. D06: removed dual declarative JSON for agent:zoto-spec-executor and command:z-eval-start. config.yml model IDs set to composer-2.5/opus-4.6. zoto-llm-reporter now emits per-case backend: code. eval:update --check still exit 2 for skill:zoto-create-plugin public-surface drift (deferred to subtask 13).
<!-- status:notes:end -->
