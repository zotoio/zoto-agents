# Live status: schemas, block markers, and MD↔YML binding

This document is the canonical binding between:

- **Authoritative data**: `*.status.yml` files validated by
  - [`templates/schema/subtask-status.schema.json`](../templates/schema/subtask-status.schema.json)
  - [`templates/schema/spec-status.schema.json`](../templates/schema/spec-status.schema.json)
- **Human projection**: paired `*.status.md` files containing fenced regions demarcated by HTML comments.

Configuration for aggregation lives in `.zoto/spec-system/config.yml` and is described by [`templates/schema/config.schema.json`](../templates/schema/config.schema.json).

## HTML comment block markers

Each markdown region that mirrors structured data MUST be wrapped using this exact pattern (lowercase **kebab-case** `<field-id>`):

```text
<!-- status:<field-id>:start -->
... free markdown / tables / lists ...
<!-- status:<field-id>:end -->
```

Rules:

- **One block per `<field-id>`** per file. Do not nest markers.
- **Whitespace** around `start` / `end` tokens is not significant; keep the hyphenated `status:` prefix literal.
- **Order** should follow the tables below so diffs stay stable when the round-trip helper rewrites the file.

## `<field-id>` values and 1:1 YAML mapping

### Per-subtask status (`subtask-NN-...status.md` ↔ `subtask-NN-...status.yml`)

| Block `<field-id>` | YAML path(s) | Notes |
|--------------------|--------------|-------|
| `metadata` | `schema_version`, `subtask_id`, `feature`, `assigned_agent`, `model`, `token_budget`, `state`, `started_at`, `last_heartbeat`, `completed_at`, `git_sha`, `agent_session_id` | Header fields only; see also **YML-only keys** below. |
| `checklist` | `checklist` | Stable `id` on each row enables merge with hand-edited markdown. |
| `artifacts` | `artifacts` | |
| `errors` | `errors` | |
| `notes` | `notes` | Single free-form block. |

**YML-only keys (no dedicated markdown block):**

| YAML key | Reason |
|---------|--------|
| `extra` | Forward-compatible bag; keep in yml so tooling can round-trip without inventing markdown. |

The JSON Schema for this document is [`subtask-status.schema.json`](../templates/schema/subtask-status.schema.json).

### Spec-root aggregate (`spec-status.md` ↔ `spec-status.yml`)

| Block `<field-id>` | YAML path(s) | Notes |
|--------------------|--------------|-------|
| `overview` | `spec_id`, `phase`, `aggregate_state`, `started_at`, `updated_at`, `config_reloaded` | `config_reloaded` is rendered as a bullet list or table in markdown but serializes as structured data in yml. |
| `progress` | `aggregate_progress` | |
| `subtasks` | `subtasks` | |
| `blockers` | `blockers` | |
| `definition-of-done` | `definition_of_done_status` | Kebab-case marker id; YAML property remains snake_case per schema. |
| `events` | `events` | At most **100** items (`maxItems` in schema). Older entries are truncated by the aggregator. |

**YML-only keys (no dedicated markdown block):**

| YAML key | Reason |
|---------|--------|
| `extra` | Same escape hatch as subtask status. |

The JSON Schema for this document is [`spec-status.schema.json`](../templates/schema/spec-status.schema.json).

## Authoritative source rule

**The YAML file is authoritative** for structured fields.

- When the round-trip helper (see downstream subtasks 05 / 07) detects that the **yml mtime is newer** than the md, it **regenerates** the markdown blocks from yml.
- When an agent **hand-edits** checklist ticks or notes **inside** the markers and the md is newer, implementations may **prefer md text** for those blocks until the next explicit yml write merges agent changes (exact merge policy is owned by the helper; this doc only defines the binding contract).
- Always trust the schema-validated yml after a successful write from automation.

## Worked round-trip (tiny subtask)

**`subtask-01-demo.status.yml`**

```yaml
schema_version: 1
subtask_id: "01"
feature: demo-feature
assigned_agent: zoto-software-engineer
model: composer-2-fast
token_budget: 200000
state: in_progress
started_at: "2026-05-06T12:00:00.000Z"
last_heartbeat: "2026-05-06T12:05:00.000Z"
checklist:
  - id: write-tests
    text: Add unit tests for parser
    done: false
    evidence_path: null
  - id: update-docs
    text: Update README
    done: true
    evidence_path: README.md
artifacts:
  - path: src/parser.ts
    kind: modified
    note: Handle edge case
errors: []
notes: |
  Waiting on review for error handling approach.
extra: {}
```

**`subtask-01-demo.status.md`**

```markdown
# Subtask 01 status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | demo-feature |
| assigned_agent | zoto-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | in_progress |
| started_at | 2026-05-06T12:00:00.000Z |
| last_heartbeat | 2026-05-06T12:05:00.000Z |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **write-tests** — Add unit tests for parser
- [x] **update-docs** — Update README (`README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `src/parser.ts` — Handle edge case
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Waiting on review for error handling approach.
<!-- status:notes:end -->
```

**Round-trip:**

1. Load yml → validate against [`subtask-status.schema.json`](../templates/schema/subtask-status.schema.json).
2. Render each block between markers; preserve marker ids and order.
3. If md is edited, parse blocks back into temporary structures; on save, merge into yml (checklist items match by `id`).
4. On conflict, **yml wins** after an automated write; manual merges should re-export yml first.

## Related configuration

Host settings for budgets, models, and aggregator filenames are validated by [`config.schema.json`](../templates/schema/config.schema.json) and documented in [`config-schema.md`](config-schema.md).

## Atomic write contract

Every helper sub-command of `spec-status-roundtrip` that mutates a `.status.yml` or `.status.md` target must write the new bytes to `<target-path>.tmp` first, then `rename(2)` the temp file into place. On success, no `*.tmp` sibling should remain. If the process stops after writing the temp file but before the rename, the previous target file content must still be the on-disk truth (readers never see a half-written primary file). This contract applies to `md-from-yml`, `yml-from-md`, paired renders during `scaffold`, and successful `heartbeat` runs — automated tests MUST assert no stray `*.tmp` peers after a zero-exit mutation.

## End-to-End Example

This walkthrough ties together spec creation, subtask ownership, heartbeats, aggregation, and judge audit fields.

**1. Spec scaffold** — `/z-spec-create` writes `{specsDir}/20260506-demo/` with `spec-….md`, subtasks, and `status/subtask-01-….status.yml` + `.status.md` pairs seeded from each subtask checklist.

**2. Executor start** — `/z-spec-execute` backgrounds `tsx scripts/spec-aggregator.ts --watch --spec-dir … --repo-root …`. Initial aggregate may write compact spec-root `status.yml` / `status.md`.

**3. Subagent heartbeat** — Subtask agent runs:

```bash
pnpm --filter @zoto-agents/zoto-spec-system run spec-status-roundtrip -- heartbeat \
  --in /abs/path/specs/20260506-demo/status/subtask-01-demo-20260506.status.yml \
  --state in_progress
```

**Fragment (`subtask-01-demo-20260506.status.yml` excerpt)**

```yaml
state: in_progress
token_budget: 150000
checklist:
  - id: D01
    text: Implement parser
    done: true
    evidence_path: src/parser.ts
```

Matching **`<!-- status:checklist:start -->`** region in `.status.md` shows `[x]` for **D01**.

**4. Completion tick** — Same helper with `--state completed` after all checklist rows have `done: true` (and `evidence_path` populated where required).

**5. Aggregator render** — On mtime change under `status/*.status.yml`, the watcher recomputes digest and rewrites spec-root **`status.yml`** with `aggregate_state`, `subtasks[]`, `events[]` (for example `kind: "rebuild"`).

**Fragment (`status.yml` excerpt)**

```yaml
aggregate_state: in_progress
events:
  - kind: rebuild
    at: "2026-05-06T15:00:00.000Z"
```

**6. Judge `extra.judge`** — After adversarial verification, implementations may attach structured notes under `extra.judge` (schema-specific); round-trip tooling preserves **`extra`** YML-only bags without inventing markdown blocks.

## CLI Reference

### `spec-status-roundtrip`

Invoked via package script or `pnpm exec tsx scripts/spec-status-roundtrip.ts`:

| Subcommand | Purpose |
|------------|---------|
| `md-from-yml` | Render block-marked `.status.md` from authoritative `.status.yml`. |
| `yml-from-md` | Parse markdown blocks back into YAML (merge policy applies). |
| `scaffold` | Create paired empty status files from templates. |
| `validate` | Validate a `.status.yml` against [`subtask-status.schema.json`](../templates/schema/subtask-status.schema.json) or aggregate schema when applicable. |
| `heartbeat` | Atomic progress write: `--state`, `--tick <checklistId>` (repeat via `pnpm exec tsx`… form when multiple ticks), `--artifact path:kind:note`, `--error severity:message`. |

### `spec-aggregator`

| Flag set | Mode |
|----------|------|
| `--once` | Single rebuild; prints JSON result; exit `0` even if `rebuilt: false`. |
| `--watch` | Poll loop for executor lifetime; stderr one-line summaries. |
| `--validate-only` | Parse and validate sources only; exit **`2`** on validation failure; **no** spec-root writes. |

Both CLIs require **`--spec-dir`** and **`--repo-root`** pointing at the dated spec folder and repo root containing **`.zoto/spec-system/config.yml`**.

## Round-Trip Rules

**Precedence**

1. When **`.status.yml` is newer** than its paired `.status.md` (mtime), tooling treats YAML as authoritative for structured fields and **regenerates** markdown blocks from YAML.
2. When **`.status.md` is newer** and edits occur **inside** valid `<!-- status:<field-id>:start/end -->` markers, merges prefer markdown-derived content for those blocks until the next explicit YAML write reconciles (implementations may round-trip md → yml then re-render).
3. After automation writes YAML successfully, **trust schema-validated YAML** as source of truth.

**Worked conflict example**

1. Agent hand-edits checklist inside markers and saves `.status.md` at `T+0`.
2. CI script writes `.status.yml` from external state without touching md at `T+1` but clock skew makes yml **older** than md → merge prefers checklist text from markdown for **D02**.
3. Operator runs `md-from-yml --in subtask.status.yml` forcing regeneration → YAML wins; operator must port any md-only intent back into YAML before regeneration.

Always resolve stale conflicts by editing **`*.status.yml`** then running **`md-from-yml`** so both sides agree.
