# Subtask: Code Quality & Implementation Review

## Metadata
- **Subtask ID**: 05
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 01
- **Created**: 20260523

## Objective

Code-level review of the plugin's TypeScript / shell / Python implementation
surface — engine modules, helpers, hooks, validation pipeline, stamped runner
templates. Identify dead paths, duplicated logic, type-safety gaps, error
handling gaps, and refactor opportunities. Recommend concrete remediations
with effort sizing.

## Deliverables Checklist

- [x] `findings-05-code-quality.md` covering:

  - [x] **Engine modules** (the `update.ts`, `eval-stamp.ts`, `eval-update.ts`, runner, case loader, graders, metrics, writer, compare, etc., wherever they live in the local copy — typically under `templates/llm/`, `templates/runner/`, `templates/static/_shared/`, and the runtime helpers). For each: line count, public exports, callers, complexity hot-spots, error paths, type-safety notes (any `any`, `as unknown as`, etc.).

  - [x] **Hook script**: `hooks/zoto-eval-session-start.mjs` (and the `.ts` source if both ship). Assess: build process (is `.mjs` regenerated from `.ts`?), dependencies, idempotency, what happens with no config / no manifest / no runs.

  - [x] **Validation pipeline**: locate `scripts/validate-plugin.ts` (referenced in CHANGELOG) and confirm it exists. Verify the `_meta.generated` literal-string compile-time check is implemented. Assess coverage gaps (does it check all the contracts the README claims?).

  - [x] **`_user-case-guards.ts`**: the file-level (`isGeneratedFile`) and case-level (`isGeneratedCase`) guards. Confirm both are wired into every write path on the runner / updater side. Identify any path that bypasses them.

  - [x] **Duplicated logic detection**: explicitly look for:
    - Parallel implementations across `templates/llm/agent-sdk/` vs `templates/llm/code-cursor-sdk/`.
    - Parallel implementations across `templates/static/{pytest,vitest,jest}/`.
    - Helper functions duplicated rather than imported from `_shared/`.

  - [x] **Dead code detection**: any module not imported from any other module within the plugin; any exported symbol not consumed.

  - [x] **Stamped templates** (the `.tmpl` files): placeholder substitution sanity (`{{CASES_JSON}}`, `{{TARGET_ID}}`, `{{MODEL_ID}}` etc.). Are placeholders always defined when stamped? Are any placeholders silently empty?

  - [x] **Build & dependency hygiene**:
    - The `node_modules/` checked into `plugins/zoto-eval-system/` — is this intentional (offline plugin install) or accidental (should be `.gitignore`'d)?
    - The `tsup` / `tsx` / `vitest` / `typescript` / `ajv` / `yaml` / `minimatch` deps under `plugins/zoto-eval-system/node_modules/` — match against any declared `package.json` in the plugin.
    - User rule mandates `yarn` + latest npm versions (per workspace user rule), but the monorepo uses `pnpm`. Note the inconsistency for subtask 09.

  - [x] **Validation script targets** (`scripts/validate-template.mjs`, `scripts/validate-skills.mjs` at the monorepo root): does the eval plugin pass them today? If not, list every failure category.

  - [x] **Error handling**: identify any `catch (e)` that swallows errors, any `process.exit(1)` without context, any unhandled rejections in the runner.

- [x] **Findings ledger** at top: severity, confidence, effort.

- [x] **Refactor candidates** ranked by impact-per-effort with a one-paragraph remediation sketch each.

- [x] **No file mutations**.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-05/`.
- [x] Every dead-code claim cites the file location and confirms zero importers.
- [x] Every duplication claim cites both copies with line refs.
- [x] Validation script run results captured (executed read-only against the local plugin path; do not modify).
- [x] No mutations outside this subtask's directory.

## Implementation Notes

- The plugin's runtime engine ships **as templates** — many `.ts` files only run after stamping into a host repo's `evals/` tree. Distinguish "engine TS" (lives in plugin) from "stamped TS" (template) when reviewing.
- Cite `start:end:filepath` from the local copy at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/...`.
- Validation scripts at `/home/andrewv/git/cursor/zoto-agents/scripts/validate-template.mjs` and `validate-skills.mjs` may be safely executed read-only (`node scripts/validate-template.mjs`, `node scripts/validate-skills.mjs`) — capture output, do not modify the scripts themselves.
- For "dead code" claims, use `Grep` to confirm zero imports/references across the entire plugin tree before flagging.

## Testing Strategy

**IMPORTANT**:
- You may run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs` once each to capture validation status. These two scripts are **explicitly pre-authorised read-only operations** — they inspect plugin manifests / skill frontmatter and emit a report; they do not mutate any source file, template, generated artefact, or configuration. They do not violate the spec-wide "no source-file mutations" guarantee.
- Do NOT run `pnpm test`, `pnpm run eval*`, or any other test/eval script.
- Do NOT modify any source file or template.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-05-23 22:56 UTC+10
- Completed: 2026-05-23 23:13 UTC+10

### Work Log
- Read authoritative subtask + prerequisite inventory outputs.
- Audited local eval plugin implementation files under `templates/`, `hooks/`, `README.md`, `CHANGELOG.md`, `.cursor-plugin/plugin.json`.
- Ran read-only validators exactly once each from monorepo root:
  - `node scripts/validate-template.mjs` (pass with 3 warnings in other plugins)
  - `node scripts/validate-skills.mjs` (4/4 skills valid in monorepo plugins)
- Produced findings report with severity ledger, dead-code grep evidence, duplication cross-citations, and ranked refactor candidates.

### Blockers Encountered
- Authoritative local plugin mirror does not include the referenced implementation files for `scripts/eval-stamp.ts`, `scripts/validate-plugin.ts`, or `_user-case-guards` source, which blocks direct code-level verification of those contracts.

### Files Modified
- `specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md`
- `specs/20260523-eval-plugin-review/subtask-05-eval-plugin-review-code-quality-20260523.md`

### Adversarial Verification (zoto-spec-judge, 2026-05-23)
- Verdict: **Verified** — all Deliverables Checklist (12/12) and DoD (5/5) items independently confirmed. All ticks remain authoritative.
- Spot-checks performed:
  - Missing-surface claim (F05-01): confirmed via `Glob` — `_user-case-guards*`, `scripts/eval-stamp.ts`, `scripts/validate-plugin.ts`, and any `scripts/**` path returned zero files in `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`.
  - Config-path-drift claim (F05-02): confirmed `.zoto/eval-system/config.json` reads at `39:39:templates/llm/code-cursor-sdk/_shared/graders/llm-judge.ts.tmpl`, `73:73:templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.jest.ts.tmpl`, `73:73:templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.vitest.ts.tmpl` while README states `config.yml` is the only supported path.
  - Inert-grading claim (F05-03): confirmed `toolCalls` initialised empty at `152:templates/llm/agent-sdk/runner.ts.tmpl` and never populated; passed to `tool-called` grader at line 191. `llm-judge` invoked with hardcoded stub `{ score: 0.5, detail: \`stub: ${prompt.length} chars\` }` at lines 194–196.
  - Dead-code spot-checks (2/2): `applyCaseUpdates` / `removeOrphanedCases` ripgrep returns only definition lines in `update.ts.tmpl`; `loadAnalyserPayload` / `emitCaseSidecar` ripgrep returns only declarations + JSDoc in `_shared/case-runner.ts.tmpl`. Both have zero in-tree call sites.
  - Duplication spot-check (1/1): `contains` grader exists at both `1:24:templates/llm/agent-sdk/graders/contains.ts.tmpl` and `10:29:templates/llm/code-cursor-sdk/graders/contains.ts.tmpl` (the second copy carries an explanatory header `1:9` plus the duplicated body) — both copies confirmed.
- Validator re-runs (read-only, executed once each from monorepo root):
  - `node scripts/validate-template.mjs` → exit 0; printed the same 3 warnings (zoto-spec-system: missing mcp.json; zoto-cursor-top: missing hooks/hooks.json; zoto-cursor-top: missing mcp.json) — matches finding doc.
  - `node scripts/validate-skills.mjs` → exit 0; `4/4 skills valid` (zoto-cursor-top + zoto-spec-system) — matches finding doc.
- Scope discipline: PASS — `git status` shows the only files touched within scope are `specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md` and this subtask file. All other modified/untracked entries (CRUX agents/skills/commands, `AGENTS.md`, `CRUX.md`, sibling subtask/finding files) are pre-existing or owned by other subtasks; none introduced by subtask 05.
