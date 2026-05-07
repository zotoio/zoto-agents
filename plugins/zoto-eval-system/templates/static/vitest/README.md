# Static eval backend — vitest

This directory ships the **first-class vitest backend** for `zoto-eval-system`'s
static eval suite (subtask 07 of the eval-system-v2 spec). When a host repo's
`.zoto/eval-system/config.yml` declares `static.framework === "vitest"`,
`scripts/eval-stamp.ts#stampVitestPerPrimitive` materialises every file in
this directory into the host repo under `evals/` and creates one
per-primitive test file at `evals/test_<kind>_<slug>.test.ts`.

## Files in this template tree

| File | Stamp destination | Purpose |
|------|--------------------|---------|
| `per-primitive-test.ts.tmpl` | `<host>/evals/test_<kind>_<slug>.test.ts` (one per primitive) | Per-primitive vitest test. Embeds the analyser payload (subtask 04) directly so generated assertions are derived from the LLM's behavioural intent rather than boilerplate shape checks. **First line is the literal marker `// _meta.generated: true`** so the cleanup engine (subtask 03) and updater (subtask 11) can detect generated files without parsing JSON. |
| `vitest.config.ts.tmpl` | `<host>/evals/vitest.config.ts` | Pins `root` to the config file's directory so `include`, `setupFiles`, and the bundled reporter resolve unambiguously regardless of cwd. Wires the custom reporter and `setup.ts`. |
| `reporters/zoto-eval-reporter.ts.tmpl` | `<host>/evals/reporters/zoto-eval-reporter.ts` | Custom `Reporter` (from `vitest/node`, vitest 4.x API) that writes `evals/_runs/<ts>/static.yml` validating against `templates/schema/result.schema.json`. Synthesises `grader_reports` with `grader: "vitest"`. Uses the deterministic shared writer for byte-identical output across runs. |
| `setup.ts.tmpl` | `<host>/evals/setup.ts` | Loads `dotenv/config` and exposes the opt-in `ensureSandboxRoot()` helper that prepares a per-case sandbox via `evals/_llm/sandbox.ts#prepareSandbox` (subtask 05). |

The shared YAML writer lives at `templates/static/_shared/result-yaml-writer.ts.tmpl`
and is stamped to `<host>/evals/_shared/result-yaml-writer.ts` by both this
backend and the jest backend (subtask 08). It is the single source of truth
for the schema-aligned YAML emission contract.

## File-level marker contract

Every `*.test.ts` file produced by the vitest stamper has the literal first line:

```ts
// _meta.generated: true
```

This marker is the **single regex** (`^// _meta\.generated: true$` against the
first line) the updater (`evals/_llm/update.ts` + subtask 11) and the cleanup
engine (subtask 03) use to gate deletion / overwrite of generated test files.
**Human-authored test files MUST NOT carry this marker** — write them at
sibling paths (e.g. `*.user.test.ts`) and the updater leaves them strictly
alone.

The same contract applies to the harness assets (`vitest.config.ts`,
`setup.ts`, `reporters/zoto-eval-reporter.ts`, `_shared/result-yaml-writer.ts`):
each carries the marker so the cleanup engine can blanket-remove them when
the framework switches.

## Bidirectional mutual-exclusion contract

Subtask 07 (vitest backend) and subtask 08 (jest backend) are mutually
exclusive at the host-repo level. Only one TypeScript static framework may be
installed or stamped per repo.

`scripts/eval-stamp.ts` exposes the symmetric helper
`assertNoConflictingFramework(target, hostRepoRoot)` that both
`stampVitestPerPrimitive` and `stampJestPerPrimitive` invoke before stamping
any asset. The helper is defined once in subtask 08's fence and re-used by
subtask 07's fence so a single canonical symbol drives both directions.

| `target` | Refuses if it observes |
|----------|------------------------|
| `"vitest"` | `evals/jest.config.{ts,js,cjs,mjs}`, `jest.config.{ts,js,cjs,mjs}`, or `jest` listed in `devDependencies` / `dependencies` |
| `"jest"`   | `evals/vitest.config.{ts,mts,js}`, `vitest.config.{ts,mts,js}`, or `vitest` listed in `devDependencies` / `dependencies` |

A guard hit raises `FrameworkConflictError` with a clear remediation message
pointing the operator at `/z-eval-configure` and the cleanup engine
(`scripts/eval-cleanup-stale.ts`, subtask 03).

**Switching between vitest and jest is a destructive operation.** The
cleanup engine deletes the previous backend's stamped harness assets and
generated `*.test.ts` files. Re-run `/z-eval-configure`, confirm the
plan, then run `/z-eval-create` to stamp the new backend.

## YAML emission

The reporter writes `<host>/evals/_runs/<runId>/static.yml` matching
`plugins/zoto-eval-system/templates/schema/result.schema.json` with
`backend: "static"`. Subtask 12's orchestrator merges this `static.yml`
with the LLM `llm.yml` into a top-level `report.yml` — **this backend
never writes the merged file itself**, only the per-backend artefact.

Aggregates included per the schema:
- `aggregates.tokens_total` — always `0` for static (vitest never
  consumes tokens; the slot is preserved for orchestrator parity).
- `aggregates.duration_ms_total` — sum of `duration_ms` across all cases.
- `aggregates.verbosity_avg` — populated when any case captures stdout
  volume via `StaticCaseRecord.verbosity`.

## Per-backend invocation

The user-facing dispatcher (`pnpm run eval` / `eval:full` / `eval:llm`) is
owned by subtask 12's orchestrator. Subtask 07 only owns the **per-backend
script**:

```bash
pnpm run eval:static:vitest
# expands to:  vitest run --config evals/vitest.config.ts
```

When `static.framework === "vitest"`, subtask 12's orchestrator dispatches
`pnpm run eval` to this script.

## Dependencies

`vitest@latest` and `js-yaml@latest` (plus `@types/js-yaml`) are added to
`package.json#/devDependencies` automatically when this backend is stamped.
The repo standardises on **pnpm** (lockfile is `pnpm-lock.yaml`); the user
rule mentions yarn but the lockfile commitment forces `pnpm add -D` —
documented in subtask 07's execution notes.

## Legacy template

The old stub at `templates/additional/vitest/` (a placeholder
`example.test.ts.tmpl` plus a minimal `vitest.config.ts.tmpl`) has been
deleted as part of subtask 07. Use `templates/static/vitest/` exclusively.
