# Subtask: Schema & Config Foundation

## Metadata
- **Subtask ID**: 01
- **Feature**: eval-system-v2
- **Assigned Subagent**: zoto-eval-configurer
- **Dependencies**: None
- **Created**: 20260503

## Objective

Extend the three core schemas (`config`, `manifest`, `result`) and the default config template so every downstream subtask has a stable contract for the new fields:

- `static.framework` — `"pytest" | "vitest" | "jest"` (Python framework is fixed; this field selects the TypeScript framework when the repo has TS primitives, and is also recorded for Python so the manifest snapshot is uniform).
- `llm.strategy` — `"code" | "declarative"`.
- `llm.codeFramework` — `"vitest" | "jest"` (only meaningful when `llm.strategy === "code"`).
- Manifest snapshots: `framework` and `strategy` values active at last `zoto-create-evals` / `zoto-update-evals` write, so the cleanup engine can detect drift without re-reading historical configs.
- Per-backend report shape inside `result.schema.json` so a `report.yml` can aggregate `static.yml` and `llm.yml` without losing per-backend totals.

The updated `update.preserveUserAuthoredCases` and `update.writeMetaMarker` hard-coded `true` constraints stay as-is.

## Deliverables Checklist

- [x] `plugins/zoto-eval-system/templates/schema/config.schema.json` — adds `static.framework`, `llm.strategy`, `llm.codeFramework` properties with enums and defaults; documents that `static.framework` and `llm.codeFramework` must be the same value when `llm.strategy === "code"` (cross-field validation noted in description, enforced at runtime by the configurer).
- [x] `plugins/zoto-eval-system/templates/schema/manifest.schema.json` — adds `discovery_config.static.framework`, `discovery_config.llm.strategy`, `discovery_config.llm.codeFramework` snapshots; bumps any required-fields list as needed; preserves backward-compatible parsing.
- [x] `plugins/zoto-eval-system/templates/schema/result.schema.json` — adds optional `report` aggregate (object with `static` and `llm` sub-objects mirroring the existing `totals`/`aggregates` shape) so a top-level `report.yml` can validate against the same schema; documents that per-backend `static.yml`/`llm.yml` keep `backend: "static" | "llm"` and the merged file uses `backend: "mixed"`.
- [x] `plugins/zoto-eval-system/templates/schema/case-meta.schema.json` — extends the per-case `_meta` block with a `primitive_analysis` object containing `source_hash` (sha256), `analysed_at` (ISO datetime), `analyser_version` (string), `summary` (short string), and `invalidate` (optional boolean — when `true`, subtask 04's analyser flow treats the cache entry as stale on the next run; consumed by subtask 02's configurer when framework/strategy switches occur).
- [x] `plugins/zoto-eval-system/templates/config.json` — populates the new fields with safe defaults (`static.framework: "pytest"`, `llm.strategy: "declarative"`, `llm.codeFramework: "vitest"`) so a fresh repo has a valid starting point. **This subtask is the sole owner of `templates/config.json` default-population**; subtask 02 only references the file (to read defaults) and never re-edits it.
- [x] `plugins/zoto-eval-system/templates/config.json` and `templates/schema/config.schema.json` — `update.preserveUserAuthoredCases: true` and `update.writeMetaMarker: true` remain `const: true` (already in place — verify no regression).
- [x] Schema files validated with a draft-07 validator (e.g. `ajv` via a one-shot script or `npx ajv` invocation) — documented validation steps committed under the subtask's Execution Notes.

## Definition of Done

- [x] All four schemas parse and self-validate against the JSON Schema draft-07 metaschema.
- [x] `templates/config.json` validates against the new `config.schema.json`.
- [x] An empty/legacy config without the new fields still validates (defaults supply the missing values).
- [x] No linter errors in modified files.

## Implementation Notes

- Cross-field validation (`llm.strategy === "code"` requires `llm.codeFramework` to be set, and `static.framework` must agree when both are TS) is **not** expressible cleanly in draft-07. Encode it as a `description` block in the schema, then enforce at runtime in the configurer (subtask 02). Mention this explicitly in the schema description so consumers don't get surprised.
- Keep `additionalProperties: true` at the root of `config.schema.json` (already in place) so future extensions don't break old consumers.
- For `result.schema.json`, the new `report` aggregate is **additive** — existing `static.yml`/`llm.yml` files keep validating without changes. Add the new field under `properties` with `additionalProperties: true` to allow further per-backend extensions.
- Coordinate with subtask 02 to ensure the configurer rewrite uses the exact same field names and enum values.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:

- Add a minimal validation script (or extend an existing one) that runs `ajv compile` against each schema and `ajv validate` of `templates/config.json` against the updated `config.schema.json`. Run only this script.
- Add one fixture-based unit test under the chosen TS test framework (deferred to phase 4) that loads the schemas and asserts the new field defaults — leave a TODO marker in the schema PR for that.
- Defer full pytest/vitest/jest suite execution to phase 5/6.

## Execution Notes

### ajv Validation

The repo already vendors `ajv@^8` as a devDependency but does not bundle `ajv-cli`. Validation was therefore run via a throwaway harness in a temp directory rather than `pnpm dlx ajv-cli` (kept the subtask schema-only and avoided polluting the lockfile):

```bash
mkdir -p /tmp/zoto-ajv-validate && cd /tmp/zoto-ajv-validate
pnpm add ajv@^8 ajv-formats@^3
node validate.mjs        # compile + sample-doc validation
node metaschema.mjs      # draft-07 metaschema validation
```

`validate.mjs` compiled all four schemas, validated `templates/config.json` and a stripped-down legacy config (no `static`/`llm.strategy`/`llm.codeFramework` keys) against the updated `config.schema.json`, and exercised positive samples for the new manifest snapshot, `result.report` aggregate, and `case-meta.primitive_analysis` block. Negative samples confirmed that bad enum values for `static.framework` (`"mocha"`) and `llm.strategy` (`"magic"`) are rejected, and that `update.preserveUserAuthoredCases: false` is rejected by the `const: true` constraint.

`metaschema.mjs` loaded the draft-07 metaschema bundled with `ajv` and ran each of the four schemas through it. Outcome:

- `[ok] config.schema.json is valid draft-07 metaschema`
- `[ok] manifest.schema.json is valid draft-07 metaschema`
- `[ok] result.schema.json is valid draft-07 metaschema`
- `[ok] case-meta.schema.json is valid draft-07 metaschema`

The temp directory was removed after validation. A persistent validation script can be added in subtask 06/07/08 when a TS test framework is committed to the repo (deferred per Testing Strategy).

### Agent Session Info
- Agent: zoto-eval-configurer
- Started: 2026-05-03T12:24:00Z
- Completed: 2026-05-03T12:28:00Z

### Work Log
- Read existing schemas and `templates/config.json` to understand current state.
- Surgically extended `config.schema.json` with a new `static` object (containing `framework: "pytest" | "vitest" | "jest"`) and added `strategy: "code" | "declarative"` plus `codeFramework: "vitest" | "jest"` to the existing `llm` object. Cross-field rule (when `llm.strategy === "code"`, `static.framework` must equal `llm.codeFramework`) is documented in the relevant `description` blocks per the subtask's Implementation Notes — runtime enforcement lands in subtask 02.
- Extended `manifest.schema.json` `discovery_config` with `static` and `llm` snapshot objects and added an explicit `additionalProperties: true` to `discovery_config` so older manifests without the new keys remain valid (kept the existing `required` list untouched to preserve backward compatibility, exactly as the subtask asks).
- Added an additive optional `report` aggregate to `result.schema.json` with `static` and `llm` sub-objects mirroring the existing `totals`/`aggregates` shape. The pre-existing `backend` enum already included `"static" | "llm" | "mixed"`, so no enum extension was required there — confirmed and documented.
- Added a `primitive_analysis` block to `case-meta.schema.json` with `source_hash` (sha256), `analysed_at` (ISO datetime), `analyser_version`, `summary`, and an optional `invalidate` boolean (default `false`). Wording explicitly notes that subtask 02's configurer sets `invalidate: true` on framework/strategy switches and subtask 04's analyser consumes it.
- Populated `templates/config.json` with the safe defaults `static.framework: "pytest"`, `llm.strategy: "declarative"`, `llm.codeFramework: "vitest"`. Confirmed `update.preserveUserAuthoredCases: true` and `update.writeMetaMarker: true` remained intact in both the schema and the template.
- Ran ajv compile, sample-document validation, draft-07 metaschema validation, and `ReadLints` on every modified file. All checks pass; no lints introduced.

### Blockers Encountered
None.

### Independent Verification (zoto-spec-judge, 2026-05-03)

Performed adversarial verification against the file system; the executing agent's tick marks above are kept because every Deliverable and Definition of Done item was independently confirmed.

Checks run from a throwaway harness in `/tmp/zoto-ajv-judge01` (ajv@8.20.0, ajv-formats@3.0.1, removed after verification):

- Read each modified file and confirmed the required surface:
  - `config.schema.json`: `static.framework` enum `[pytest, vitest, jest]` with default `pytest`; `llm.strategy` enum `[code, declarative]` with default `declarative`; `llm.codeFramework` enum `[vitest, jest]` with default `vitest`; cross-field rule documented in `description` (not enforced in draft-07, deferred to subtask 02 per Implementation Notes); root `additionalProperties: true`; `update.preserveUserAuthoredCases` and `update.writeMetaMarker` retain `const: true`.
  - `manifest.schema.json`: `discovery_config.static.framework`, `discovery_config.llm.strategy`, `discovery_config.llm.codeFramework` snapshots present with `additionalProperties: true` on `discovery_config`; existing `required` list unchanged so legacy manifests still parse.
  - `result.schema.json`: optional additive `report` aggregate with `static` and `llm` sub-objects mirroring `totals`/`aggregates`; `backend` enum is `[static, llm, mixed]`.
  - `case-meta.schema.json`: `primitive_analysis` block requires `source_hash` (sha256 pattern), `analysed_at` (date-time), `analyser_version`, `summary`; `invalidate` is optional boolean with default `false`.
  - `templates/config.json`: populates `static.framework: "pytest"`, `llm.strategy: "declarative"`, `llm.codeFramework: "vitest"`; `update.preserveUserAuthoredCases` and `update.writeMetaMarker` still `true`.
- `metaschema.mjs` ran the bundled draft-07 metaschema against all four schemas:
  - `[ok] config.schema.json is valid draft-07 metaschema`
  - `[ok] manifest.schema.json is valid draft-07 metaschema`
  - `[ok] result.schema.json is valid draft-07 metaschema`
  - `[ok] case-meta.schema.json is valid draft-07 metaschema`
- `validate.mjs` ran 19 expectations and all passed:
  - `templates/config.json` validates against the updated `config.schema.json`.
  - A stripped-down legacy config (no `static`, no `llm.strategy`, no `llm.codeFramework`) and an empty `{}` config both validate (defaults supply the missing fields).
  - Negative samples rejected: `static.framework: "mocha"`, `llm.strategy: "magic"`, `update.preserveUserAuthoredCases: false`, `update.writeMetaMarker: false`.
  - Manifest with new `static`/`llm` snapshots validates; legacy manifest (no snapshot blocks) still validates; `manifest.discovery_config.static.framework: "mocha"` rejected.
  - Result with `backend: "mixed"` and the new `report` aggregate validates; legacy `backend: "static"` result without `report` validates; `backend: "magic"` rejected; `report.static.backend: "llm"` rejected.
  - Case-meta with full `primitive_analysis` validates; missing optional `invalidate` validates; bad `source_hash` and missing `summary` rejected.
- `ReadLints` clean on all five modified files.

Verdict: **Verified** — all Deliverables Checklist and Definition of Done items independently confirmed.

### Files Modified
- `plugins/zoto-eval-system/templates/schema/config.schema.json`
- `plugins/zoto-eval-system/templates/schema/manifest.schema.json`
- `plugins/zoto-eval-system/templates/schema/result.schema.json`
- `plugins/zoto-eval-system/templates/schema/case-meta.schema.json`
- `plugins/zoto-eval-system/templates/config.json`
- `specs/20260503-eval-system-v2/subtask-01-eval-system-v2-schema-config-20260503.md` (this file — execution notes only)
