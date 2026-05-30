# Static eval backend — jest

This directory ships the **first-class jest backend** for `zoto-eval-system`'s
static eval suite. When a host repo's `.zoto/eval-system/config.yml` declares
`static.framework === "jest"`, `scripts/eval-stamp.ts#stampJestPerPrimitive`
materialises every file in this directory into the host repo under `evals/`.

## Files in this template tree

| File | Stamps to (host repo) | Purpose |
|------|------------------------|---------|
| `per-primitive-test.ts.tmpl` | `evals/<slug>.test.ts` | Per-primitive jest test. Stamped once per discovered command/agent/hook/skill primitive. **First line is the literal marker `// _meta.generated: true`** so the cleanup engine and updater can detect generated files without parsing JSON. |
| `jest.config.ts.tmpl` | `evals/jest.config.ts` | Jest configuration wired to `ts-jest`'s ESM preset, the bundled custom reporter, and `setup.ts` (loaded via `setupFilesAfterEnv`). |
| `setup.ts.tmpl` | `evals/setup.ts` | Loads `dotenv/config` and prepares a per-case sandbox via `evals/_llm/sandbox.ts`. Uses `beforeEach` / `afterAll` from `@jest/globals` and is therefore wired to `setupFilesAfterEnv` (NOT `setupFiles`). |
| `reporters/zoto-eval-reporter.ts.tmpl` | `evals/reporters/zoto-eval-reporter.ts` | Custom `Reporter` (from `@jest/reporters`) that writes `evals/_runs/<ts>/static.yml` validating against `templates/schema/result.schema.json`. Synthesises `grader_reports` with `grader: "jest"`. Delegates YAML emission to the shared writer below. |

The shared writer is canonically owned by subtask 07 (vitest backend) and
stamped at `evals/_shared/result-yaml-writer.ts`. Both reporters import the
same module so identical test runs produce byte-equal `static.yml`.

## Bidirectional mutual-exclusion contract

Subtask 07 (vitest backend) and subtask 08 (jest backend) are mutually
exclusive at the host-repo level. Only one static framework may be installed
or stamped per repo.

`scripts/eval-stamp.ts` exposes a small symmetric helper —
`assertNoConflictingFramework(target, hostRepoRoot)` — that both
`stampVitestPerPrimitive` and `stampJestPerPrimitive` invoke before stamping.
The guard refuses to stamp when the **other** framework's config or
devDependency is present, throws `FrameworkConflictError`, and prints a
clear error pointing the user at `/z-eval-configure` and the cleanup
engine.

| `target` | Refuses if it observes |
|----------|------------------------|
| `"jest"` | `evals/vitest.config.{ts,mts,js}`, `vitest.config.{ts,mts,js}`, or `vitest` listed in `dependencies` / `devDependencies` |
| `"vitest"` | `evals/jest.config.{ts,js,cjs,mjs}`, `jest.config.{ts,js,cjs,mjs}`, or `jest` listed in `dependencies` / `devDependencies` |

The guard is the **single source of truth** for mutual exclusion. Do not
re-implement framework detection inline in either backend's stamping helper —
call `assertNoConflictingFramework(...)` and let it throw. **Subtask 07
(vitest) is the canonical owner of the helper**; subtask 08 ships a
placeholder under its own fence in `scripts/eval-stamp.ts` that subtask
07's canonical implementation replaces. Call sites stay unchanged.

## File-level marker contract

Every generated jest asset (test files, config, setup, reporter) carries
the literal first line:

```ts
// _meta.generated: true
```

This is intentionally simple — a single regex (`^// _meta\.generated: true$`)
applied to the first line of any test file is enough for the updater
(`evals/_llm/update.ts` + subtask 11) and the cleanup engine to decide
whether the file is safe to regenerate or delete. **Human-authored test
files MUST NOT carry this marker** — write them at sibling paths (e.g.
`evals/<slug>.user.test.ts`) and the updater leaves them strictly alone.

## YAML emission

Both jest and vitest reporters emit a `static.yml` that matches
`result.schema.json`. The actual writer lives at
`../_shared/result-yaml-writer.ts.tmpl` and is **canonically owned by
subtask 07 (vitest)**. The contract is documented in that file's header
and is the source of truth for both reporters:

- `buildStaticReportDocument(input)` → `StaticReportDocument` (deterministic
  key sort, `tokens_total: 0` baked in for static runs, `verbosity_avg`
  computed only when at least one case reports stdout volume).
- `writeStaticReport(absolutePath, doc)` → writes the YAML to disk under
  `mode 0o644` and creates parent directories at `mode 0o755`.

The reporter passes `framework: "jest"` so the emitted document carries
`report.framework: "jest"` for downstream consumers.

## Per-backend invocation

The user-facing dispatcher (`pnpm run eval` / `eval:full` / `eval:llm`) is
owned by subtask 12's orchestrator. Subtask 08 only owns the **per-backend
script**:

```bash
pnpm run eval:static:jest
# expands to:  NODE_OPTIONS=--experimental-vm-modules jest --config evals/jest.config.ts
```

`--experimental-vm-modules` is required because `ts-jest`'s ESM preset
needs jest's experimental ESM transformer to resolve `.ts` files. When
`static.framework === "jest"`, subtask 12's orchestrator dispatches
`pnpm run eval` to this script.

## Mutual-exclusion guard at install time

If the host repo carries vitest config files or a `vitest` devDependency,
`stampJestPerPrimitive` throws `FrameworkConflictError` *before* writing
anything. The error message lists the conflicting paths and points at
`/z-eval-configure` plus the cleanup engine.

To resolve the conflict:

1. Run `/z-eval-configure` and pick a single static framework.
2. Apply the cleanup plan it emits (subtask 03's cleanup engine deletes
   the unused backend's stamped assets).
3. Re-run `/z-eval-create` (or the `stampJestPerPrimitive` helper).

## Dependencies

The `package.deps.json` next to this file lists the jest devDependencies
that the configurer (subtask 02) merges into the host repo's `package.json`
when `static.framework === "jest"`:

- `jest` (latest 30.x — runner)
- `ts-jest` (latest 29.x — TS preset)
- `@jest/reporters` (latest 30.x — Reporter type)
- `@types/jest` (latest 30.x — TS typings)
- `js-yaml` (latest 4.x — shared YAML writer)
- `@types/js-yaml` (latest 4.x — typings for the shared writer)
- `dotenv` (latest 17.x — `setup.ts` env loader)

The configurer uses `pnpm add -D <pkg>@latest` for installation. The
top-level user rule says "yarn + latest"; this repo is `pnpm`-native
(committed lockfile + workspace), so the substitution is documented at
the spec level under subtask 08's execution notes.
