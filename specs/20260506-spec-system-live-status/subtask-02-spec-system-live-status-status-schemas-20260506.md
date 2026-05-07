# Subtask: Status Schemas + MD↔YML Binding Convention

## Metadata
- **Subtask ID**: 02
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: None
- **Created**: 20260506

## Objective

Author the JSON Schemas that govern the spec-root **`status.yml`** and per-subtask **`subtask-NN-...status.yml`** payloads, extend `config.schema.json` with the `subagents.*` and `aggregator.*` blocks, and document the **HTML-comment block-marker** convention that binds each markdown block in the paired `.status.md` files to a typed schema field. Three downstream subtasks (03, 05, 06, 07) consume these contracts.

## Deliverables Checklist

### New schemas
- [x] `plugins/zoto-spec-system/templates/schema/subtask-status.schema.json` (draft-07) — required fields:
  - `schema_version: integer const 1`
  - `subtask_id: string` (matches `^[0-9]{2}$`, e.g. `01`)
  - `feature: string`
  - `assigned_agent: string` (one of the values in the spec's manifest, e.g. `zoto-software-engineer`)
  - `model: string` (resolved at spawn time)
  - `token_budget: integer` (resolved at spawn time, mirrors `subagents.<role>.tokenBudget`)
  - `state: string` enum `["pending", "in_progress", "blocked", "completed", "failed"]`
  - `started_at: string format date-time` (optional)
  - `last_heartbeat: string format date-time` (optional)
  - `completed_at: string format date-time` (optional)
  - `checklist: array` of `{ id: string, text: string, done: boolean, evidence_path: string|null }` — IDs are stable across heartbeats so the round-trip helper can locate items.
  - `artifacts: array` of `{ path: string, kind: string enum ["created","modified","deleted"], note: string|null }`
  - `errors: array` of `{ at: string format date-time, message: string, severity: string enum ["info","warn","error"] }`
  - `notes: string` (free-form, single block in the md)
  - `git_sha: string` (optional; commit SHA checked out when the status was last written — best-effort `git rev-parse HEAD`)
  - `agent_session_id: string` (optional; Cursor agent run id when known, e.g. `process.env.CURSOR_AGENT_SESSION_ID`)
  - `extra: object additionalProperties true` (escape hatch for future fields)
  - `additionalProperties: false` at the root
- [x] `plugins/zoto-spec-system/templates/schema/spec-status.schema.json` (draft-07) — required fields:
  - `schema_version: integer const 1`
  - `spec_id: string` (e.g. `20260506-spec-system-live-status`)
  - `phase: integer` (current execution phase, 0 when not yet started)
  - `aggregate_state: string` enum `["pending","in_progress","blocked","failed","completed"]`
  - `started_at: string format date-time` (optional)
  - `updated_at: string format date-time`
  - `aggregate_progress: object` `{ total: integer, completed: integer, in_progress: integer, blocked: integer, failed: integer }`
  - `subtasks: array` of `{ subtask_id: string, state: string, status_path: string, last_heartbeat: string format date-time | null }` — one entry per `status/*.status.yml` file the aggregator scanned
  - `blockers: array` of `{ subtask_id: string, reason: string, path: string }` — auto-populated when any subtask is `blocked` or `failed`
  - `definition_of_done_status: array` of `{ id: string, text: string, done: boolean }` — mirrors the spec index's Definition of Done items so the aggregator can roll them up
  - `config_reloaded: array` of `{ at: string format date-time, mtime: string format date-time }` — append-only audit trail of every time the live loader saw a new mtime
  - `events: array` of `{ at: string format date-time, kind: string, message: string }` — short audit log (truncated at 100 entries)
  - `extra: object additionalProperties true`
  - `additionalProperties: false`

### Extended config schema
- [x] `plugins/zoto-spec-system/templates/schema/config.schema.json` — **new file** (today there is no formal schema for the obsolete repo-root plugin config layout noted in early drafts; only a free-text doc). Mirror the eval-system style and include:
  - All existing config keys documented in `plugins/zoto-spec-system/docs/config-schema.md` (`unitOfWork`, `specsDir`, `workDir`, `hooks.sessionStartNudge.*`, `spec.maxSubtasks`, `spec.parallelLimit`, `spec.adversarialVerification`, `extensions.memory.*`)
  - `subagents` block with `default`, `generator`, `executor`, `judge`, `subtask` sub-objects, each with `tokenBudget` (integer, min 1000, max 2000000, default 200000) and optional `model` (string)
  - `aggregator` block with `enabled` (boolean, default `true`), `pollIntervalMs` (integer, default 1500, min 250, max 60000), `debounceMs` (integer, default 250, min 50, max 5000), `outputs.specStatusMd` (string, default `status.md`), `outputs.specStatusYml` (string, default `status.yml`)
  - `additionalProperties: true` at the root (forward-compatible)

### Binding documentation
- [x] `plugins/zoto-spec-system/docs/status-schema.md` — single canonical source describing:
  - The HTML-comment block marker convention: `<!-- status:<field-id>:start -->` and `<!-- status:<field-id>:end -->`
  - The full list of `<field-id>` values that may appear in a `subtask-NN-...status.md` (`metadata`, `checklist`, `artifacts`, `errors`, `notes`) and a `spec-status` `.status.md` (`overview`, `progress`, `subtasks`, `blockers`, `definition-of-done`, `events` — lowercase kebab-case; YAML field remains `definition_of_done_status`)
  - The exact yml field that each block maps to (one-to-one)
  - A worked example for a tiny subtask showing the md, the yml, and the round-trip
  - A note that the **yml is authoritative**: the round-trip helper (subtask 05 / 07) regenerates the md from the yml whenever it has a newer mtime, but otherwise prefers the md text inside the markers when an agent has hand-edited a checklist tick
- [x] `plugins/zoto-spec-system/templates/status/subtask-status.md.tmpl` — markdown template with all block markers in place and `{{placeholder}}` slots so subtask 05 can stamp it
- [x] `plugins/zoto-spec-system/templates/status/subtask-status.yml.tmpl` — yml template mirroring the md template's marker set
- [x] `plugins/zoto-spec-system/templates/status/spec-status.md.tmpl` and `.yml.tmpl` — same for the spec-root aggregate (subtask 07 stamps these)

## Definition of Done
- [x] All four schemas (`subtask-status`, `spec-status`, `config`) plus the existing draft-07 metaschema validation pass for each new file
- [x] The five new template files exist with correct block markers
- [x] `docs/status-schema.md` is committed and references all schemas explicitly with a worked round-trip example
- [x] No linter errors in modified files (`pnpm --filter @zoto-agents/zoto-spec-system validate`)

## Implementation Notes

- Use the eval-system schemas (`plugins/zoto-eval-system/templates/schema/{config,manifest,result,case-meta,cleanup-plan}.schema.json`) as the style anchor: `$schema`, `$id`, `title`, descriptive `description` blocks on every nested object, sensible `default`/`min`/`max` on numeric fields, `additionalProperties: false` only on closed objects (`subtask-status` and `spec-status` close their root with `additionalProperties: false`; `config.schema.json` keeps the root open with `additionalProperties: true`).
- Validate the new schemas against the bundled draft-07 metaschema using `ajv` (already vendored in the eval-system harness — copy that pattern into a one-shot script under `/tmp/`; do not pollute the lockfile).
- The `extra: object additionalProperties: true` escape hatch on `subtask-status` and `spec-status` is intentional: it allows future audit fields without a schema bump.
- Block-marker IDs use lowercase kebab-case to stay consistent with file names and CRUX rule names.
- Keep the worked round-trip example small (one subtask, two checklist items) so the binding is unambiguous.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run the schemas through the draft-07 metaschema using a temp-dir `ajv` harness. Validate the four `.tmpl` files (after substituting `{{placeholder}}` slots with sample values) against the schemas.
- Defer the full plugin test suite to subtask 08.

## Execution Notes

### Agent Session Info
- Agent: zoto-plugin-manager (substituted for crux-platform-architect)
- Started: 2026-05-06T14:10:00.000Z
- Completed: 2026-05-06T14:45:00.000Z

### Work Log
- Added `templates/schema/{subtask-status,spec-status,config}.schema.json` (draft-07, eval-system style) and `docs/status-schema.md` (markers, 1:1 YAML map, kebab-case `definition-of-done` → `definition_of_done_status`, authoritative yml + merge note).
- Added `templates/status/*.tmpl` (paired md/yml with `{{placeholder}}` slots).
- Transient validation: `/tmp/zoto-s02-val/` with `npm install ajv@8 ajv-formats yaml@2`, script `validate.mjs` — `ajv.validateSchema` on each new schema; YAML parse of substituted `*.yml.tmpl` + patched arrays → instance validate; markdown marker pairing assert for `*.md.tmpl`. Exit **0**.
- Attempted `npx ajv-cli@latest validate -s /tmp/draft-07-schema.json -d ...` — failed (duplicate id / invalid meta handling in cli). Harness above used instead.
- `pnpm --filter @zoto-agents/zoto-spec-system validate` — exit **0** (adjusted `README.md` and `config.schema.json` strings to satisfy `no_crux_references`).

### Blockers Encountered
- `ajv-cli` draft-07 URL/local metaschema run failed with duplicate schema id; replaced with Ajv `validateSchema` + instance checks in `/tmp/zoto-s02-val/validate.mjs`.

### Files Modified
- `plugins/zoto-spec-system/templates/schema/subtask-status.schema.json` (new)
- `plugins/zoto-spec-system/templates/schema/spec-status.schema.json` (new)
- `plugins/zoto-spec-system/templates/schema/config.schema.json` (new)
- `plugins/zoto-spec-system/docs/status-schema.md` (new)
- `plugins/zoto-spec-system/templates/status/subtask-status.md.tmpl` (new)
- `plugins/zoto-spec-system/templates/status/subtask-status.yml.tmpl` (new)
- `plugins/zoto-spec-system/templates/status/spec-status.md.tmpl` (new)
- `plugins/zoto-spec-system/templates/status/spec-status.yml.tmpl` (new)
- `plugins/zoto-spec-system/README.md` (memory-tooling wording; `no_crux_references`)

### Judge Verification (zoto-spec-judge)
- 2026-05-06: independent adversarial verification — Verdict: **Verified**.
- Draft-07 metaschema validation (three schemas): `python3 jsonschema.Draft7Validator.check_schema(...)` exit **0** for `subtask-status`, `spec-status`, `config`.
- Draft-07 compile (three schemas): `npx ajv-cli@5.0.0 + ajv-formats@3.0.1 compile -c ajv-formats -s <schema>` reported `is valid` for all three (exit **0**).
- Per-file JSON parse: `python3 json.load(...)` exit **0** for all three schemas (no malformed JSON).
- Template-against-schema validation: substituted `{{placeholder}}` slots in `subtask-status.yml.tmpl` and `spec-status.yml.tmpl`, parsed via `yaml.safe_load`, validated with `jsonschema.Draft7Validator(format_checker=FormatChecker())` — both **OK**.
- Marker integrity: regex `<!-- status:([a-z0-9-]+):(start|end) -->` confirmed balanced and unique on both md templates — `subtask-status.md.tmpl` ids `{metadata, checklist, artifacts, errors, notes}`; `spec-status.md.tmpl` ids `{overview, progress, subtasks, blockers, definition-of-done, events}`.
- Doc round-trip example: extracted yaml fenced block from `docs/status-schema.md` and validated against `subtask-status.schema.json` — **OK**.
- Field-by-field: every required field listed in the Deliverables Checklist is present in the corresponding schema with the correct type/enum/const/`additionalProperties` policy (`subtask-status`/`spec-status` close the root with `additionalProperties: false`; `config.schema.json` keeps the root open with `additionalProperties: true`; `events.maxItems = 100` is enforced on `spec-status`).
