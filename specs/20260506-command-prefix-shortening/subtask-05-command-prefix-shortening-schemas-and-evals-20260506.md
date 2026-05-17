# Subtask: Schemas, Eval Cases, and Validation Scripts

## Metadata
- **Subtask ID**: 05
- **Feature**: command-prefix-shortening
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02, 03
- **Created**: 20260506

## Objective

Update every place outside of running prose where a slash command is hard-coded as data: JSON Schema files, skill `evals/evals.json` cases, validation scripts, and runtime error-message strings in TypeScript. Add at least one new eval case per plugin that asserts the back-compat alias dispatches the same workflow as the canonical command, so the alias contract is enforceable and not just documented.

## Deliverables Checklist
- [ ] Audit `plugins/zoto-spec-system/templates/schema/*.json` and `plugins/zoto-eval-system/templates/schema/*.json` for any `description`, `examples`, or hard-coded constant that mentions a slash command. Update each match to the canonical short form.
- [ ] Update `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` if it currently references `/zoto-eval-configure` (or any other command) inside a `description` / `examples`
- [ ] Update `plugins/zoto-spec-system/skills/*/evals/evals.json` cases that hard-code slash-command prompts or expected_output strings (e.g. `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec` skill evals)
- [ ] Update `plugins/zoto-eval-system/skills/*/evals/evals.json` cases that hard-code slash-command prompts — explicit list:
  - `zoto-help-evals/evals/evals.json` (cases that prompt `/zoto-eval-help`)
  - `zoto-advise-evals/evals/evals.json` (cases that prompt `/zoto-eval-advise` and reference handoffs to `/zoto-eval-create` / `/zoto-eval-update`)
  - `zoto-create-evals/evals/evals.json`, `zoto-update-evals/evals/evals.json`, `zoto-execute-evals/evals/evals.json`, `zoto-judge-evals/evals/evals.json`, `zoto-compare-evals/evals/evals.json`, `zoto-configure-evals/evals/evals.json`, `zoto-eval-tooling/evals/evals.json` — any cases that name commands in `prompt` or `expected_output`
- [ ] Add at least **one** alias-coverage eval case per plugin (and per `askQuestion`-owning command):
  - `zoto-help-evals` — keep a `/z-eval-help` canonical case AND add a `/zoto-eval-help` alias case asserting both invoke the same skill with equivalent expected_output
  - `zoto-advise-evals` — keep a `/z-eval-advise` canonical case AND add a `/zoto-eval-advise` alias case (this also exercises the two-breakpoint askQuestion contract through the alias)
  - One Spec System skill (`zoto-create-spec` recommended) — keep `/z-spec-create` canonical AND add `/zoto-spec-create` alias case
- [ ] Audit `plugins/zoto-eval-system/scripts/eval-update.ts`, `plugins/zoto-eval-system/scripts/eval-discover.ts`, `scripts/eval-stamp.ts`, `scripts/eval-cleanup-stale.ts`, `scripts/eval-orchestrate.ts`, `scripts/eval-analyse.ts`, `scripts/eval-discover.ts` (root) — wherever a slash command appears inside an **error message or help string literal**, switch it to the canonical short form
- [ ] Audit `evals/_llm/*.ts` files (e.g. `runner.ts`, `update.ts`, `manifest-snapshot.ts`, `case.ts`, `sandbox.ts`, `sdk-bridge.ts`, `analyser.cache.selftest.ts`, `runner-validate-enriched.test.ts`, `result.schema.json`, `README.md`) for slash-command literals; update strings, leave class/function/field identifiers alone
- [ ] Audit `evals/test_meta_invariants.py` and `scripts/test.py` for any hard-coded slash command names
- [ ] Audit template files under `plugins/zoto-eval-system/templates/llm/agent-sdk/*.tmpl`, `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/*.tmpl`, `plugins/zoto-eval-system/templates/static/{pytest,jest,vitest}/**/*.tmpl`, `plugins/zoto-eval-system/templates/runner/*.tmpl`, `plugins/zoto-eval-system/templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` — update slash-command literals (these propagate into host-repo evals on next stamp)
- [ ] Audit `plugins/zoto-spec-system/templates/init-config.yml`, `plugins/zoto-eval-system/templates/init-config.yml`, and `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto/eval-system/config.yml` (note: prose-level updates here are owned by subtask 04; this subtask only updates them if they contain *structured* data fields with command names like `examples:` or `defaults:`)
- [ ] Confirm `scripts/validate-template.mjs` and `scripts/validate-skills.mjs` do NOT regress — the validators do not hard-code a `zoto-spec-` / `zoto-eval-` prefix policy, so adding `z-spec-*` / `z-eval-*` files alongside should pass; if any check assumes a prefix, update the validator to accept both
- [ ] Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs` after edits — both must exit 0
- [ ] Run `pnpm --filter @zoto-agents/zoto-eval-system test` and `pnpm --filter @zoto-agents/zoto-spec-system test` — both must pass

## Definition of Done
- [ ] No structured-data file under the in-scope set contains a stale `/zoto-spec-*` or `/zoto-eval-*` literal that should have moved to the canonical short form
- [ ] At least one alias-coverage eval case exists per plugin, plus one per `askQuestion`-owning command (`/zoto-eval-help`, `/zoto-eval-advise`)
- [ ] Validators and per-plugin tests pass
- [ ] No file under "Out of Scope" was modified

## Implementation Notes

- The slash-command literal lives almost exclusively inside string values: `description`, `examples`, `prompt`, `expected_output`, error messages thrown by `eval-stamp.ts` etc. Class names, function names, file paths, and import specifiers stay as-is.
- The eval cache JSON under `.zoto/eval-system/cache/analyser/**` is **regenerated** automatically — leave it alone; it will refresh on next analyser run.
- The `.zoto/eval-system/manifest.yml` and `.zoto/eval-system/manifest.history.yml` capture analyser inputs/outputs by target id (e.g. `command:zoto-eval-create`). The target id IS the canonical analyser key; this subtask treats it as **out of scope** unless the analyser itself uses the slash-command literal as a key (verify; if it does, document the migration path).
- For SKILL eval cases that test the help command:
  - Keep prompt `/z-eval-help` as the **primary** case asserting the README-anchored response
  - Add a sibling case with prompt `/zoto-eval-help` whose `expected_output` asserts the same workflow runs (the alias delegation contract); this catches accidental future divergence
- Validation scripts: open `scripts/validate-template.mjs` and search for any string `zoto-spec-` or `zoto-eval-`. The current logic only enforces marketplace and plugin name patterns — neither targets command prefix — so likely no logic change is required. If a check exists, extend it to allow both prefixes.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs` after every batch
- Run `pnpm --filter @zoto-agents/zoto-eval-system test` and `pnpm --filter @zoto-agents/zoto-spec-system test`
- Defer root `pnpm test` to subtask 07

## Execution Notes

_To be filled by executing agent._

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log

### Blockers Encountered

### Files Modified
