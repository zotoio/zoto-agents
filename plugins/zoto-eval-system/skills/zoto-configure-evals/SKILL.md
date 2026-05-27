---
name: zoto-configure-evals
description: Writes .zoto/eval-system/config.yml from field values pre-collected by /z-eval-configure (command-owned askQuestion). Refuses bundled update.preserveUserAuthoredCases:false or update.writeMetaMarker:false (including nested payload mirrors) before any manifest read or config write. Validates against templates/schema/config.schema.json. Diffs the chosen config against the manifest snapshot (discovery_config.static.framework) to produce a cleanup_plan validated against templates/schema/cleanup-plan.schema.json, and stamps _meta.primitive_analysis.invalidate=true on every cached primitive analysis when the static framework changes. The unified LLM eval harness ships one TS-everywhere co-located eval per target, with no per-repo selector axis — only the static framework matters here. Never calls askQuestion — returns needs_user_input if validation cannot proceed without user clarification.
---

# Configure Evals

Configuration for the Eval System plugin. Interactive questions are asked **only** by the `/z-eval-configure` command; this skill consumes the collected answers, writes JSON, and emits a `cleanup_plan` for the command to confirm before any destructive change.

## Configuration

Writes `.zoto/eval-system/config.yml` at the repository root. Validated against `templates/schema/config.schema.json`.

### Subtask 01 (v2) fields the skill writes

| Field | Type | Default | Notes |
|---|---|---|---|
| `static.framework` | enum `pytest` / `vitest` / `jest` | `pytest` | Active static framework for the repo. Python primitives always use pytest regardless; for TS primitives this picks between vitest and jest. |

The LLM backend is **single-shape**: every host repo emits co-located `<kind>/evals/<name>.test.ts` files driven by the unified LLM eval harness at `evals/llm/_shared/run-llm-suite.ts` (exported as `defineLlmEval`). There is no per-repo backend selector field — the harness reads each case's `requiresInteraction` flag and branches at runtime between the scripted-answer path (interactive primitives) and the single-prompt path (non-interactive primitives).

Switching `static.framework` is a config-changing operation; this skill produces a `cleanup_plan` and the command (`/z-eval-configure`) handles user confirmation and shells out to subtask 03's ``pnpm run eval:cleanup-stale`` for execution.

### Advanced (optional): `ignore`

Repos can set `"ignore": []` — an array of **minimatch** glob strings matched against repo-relative POSIX paths (forward slashes only) pointing at primary sources (`SKILL.md`, `commands/*.md`, `agents/*.md`, `hooks/*.json`, etc.). Generators stampers skip ignored targets entirely; **`scripts/eval-cleanup-vendored.ts`** can delete leftover generated eval JSON for those sources. Defaults to **`[]`** (everything eligible). Omit from interactive configure flows unless operators explicitly upstream-vendor assets (`crux-*`, etc.). See `templates/config.json`.

Two fields are hard-coded contracts and cannot be disabled:

- `update.preserveUserAuthoredCases: true`
- `update.writeMetaMarker: true`

The schema rejects any config that tries to flip either to `false`.

## When to Use

Use this skill when:
- The user runs `/z-eval-configure` (after the command has gathered answers).
- Another workflow needs config written and the command has supplied values.

## Workflow

### Step 0: Immutable `update` flags — refuse before any read/write

Inspect the bundled answers **before** reading the manifest snapshot, **before** merging fields below, and **before** writing `.zoto/eval-system/config.yml`, appending `manifest.history.yml`, emitting a `cleanup_plan`, or stamping `_meta.primitive_analysis.invalidate`.

Commands nest questionnaire output differently; check every mirror that appears in the Task payload, including:

- `update.preserveUserAuthoredCases` / `update.writeMetaMarker`
- The same keys at the **top level** when `/z-eval-configure` flattens answers
- Nested wrappers such as `answers.update.*`, `bundledAnswers.update.*`, or `configureAnswers.update.*` when the orchestrator forwarded a sub-object

If **either** flag is present and **`false`**, that is an upstream contract breach — both values are hard-coded **`true`** and are not operator-configurable:

- Respond with an explicit refusal (do **not** silently coerce to `true` and continue).
- **Do not** write `config.yml`, **do not** append manifest history, **do not** emit a `cleanup_plan`, **do not** stamp analyser invalidate flags — stop after the refusal so the command can repair the payload.

Absent keys are fine (defaults remain `true`). Only an explicit **`false`** triggers refusal.

After this gate passes, continue.

### Step 1: Consume the command payload

Expect the Task prompt to include:

- Whether to overwrite an existing config (if one existed).
- Values for each field below (the command asked via `askQuestion` already), including `static.framework`.

If critical fields are missing, return `needs_user_input` — **never** call `askQuestion`.

### Step 2: Read the manifest snapshot (source of truth for "what's currently stamped")

Run only after **Step 0** succeeds.

Before applying the new config, read the current snapshot via the canonical helper at `plugins/zoto-eval-system/engine/manifest-snapshot.ts`:

```ts
import { readManifestSnapshot } from "plugins/zoto-eval-system/engine/manifest-snapshot";
const oldSnapshot = readManifestSnapshot(); // { static, llm, discoveryTargets, effectiveDiscoveryTargets, evalFiles, source }
```

`discoveryTargets` reflects what was last recorded on the manifest. When the operator sets `discoveryTargets` in `config.yml`, `effectiveDiscoveryTargets` carries the **narrowed** list (YAML wins). `evalFiles` omits tooling phantom catalogue paths (`*.eval.json`, plugin `evals/*.json` ghosts) so `cleanup_plan` and cache invalidation only touch real assets.

`source` will be:

- `"manifest"` — `.zoto/eval-system/manifest.yml -> discovery_config.static / discovery_config.llm` (canonical, post-subtask-01).
- `"filesystem"` — manifest exists but predates subtask 01; `static.framework` was inferred from filesystem fingerprints (`evals/conftest.py` ⇒ pytest, `vitest.config.ts` ⇒ vitest, `jest.config.{js,ts}` ⇒ jest). `llm.*` is intentionally left unset on legacy snapshots; the cleanup engine treats LLM as "no prior co-located surface" for those repos.
- `"missing"` — no manifest at all; `cleanup_plan` will be empty.

The skill **does not** read user-authored test files. It only enumerates files matching:

- The manifest's `targets[].eval_files[]` arrays (returned as `oldSnapshot.evalFiles`).
- The static-framework fingerprints listed above.
- The co-located unified LLM eval files (`<kind>/evals/<name>.test.ts`); subtask 03 owns the enumeration logic — this skill hands off the snapshot diff, not the file list.

### Step 3: Apply fields

Fields to write, in order (values come from the payload):

| # | Field | Notes |
|---|-------|-------|
| 1 | `evalsDir` | Default `evals`; may override. |
| 2 | `skillsRoots` | As selected by the command. |
| 3 | `discoveryTargets` | As selected by the command. |
| 4 | `static.framework` | `pytest` / `vitest` / `jest`; default `pytest`. |
| 5 | `llm.runtime` | `tsx` (default) / `node`. |
| 6 | `llm.model.id` | `composer-2.5` / `opus-4.6` / `sonnet`. |
| 7 | `judgeModel` | Same options; default `opus-4.6`. |
| 8 | `manualChecklists.enabled` | boolean. |
| 9 | `additionalAutomation` | list. |
| 10 | `ignore` | Optional glob list (`[]` default). Advanced — upstream-vendored paths to exclude from eval generation/cleanup tooling. |
| 11 | `update.criticalChangeRules.*` | five booleans (defaults yes). |

`update.preserveUserAuthoredCases` and `update.writeMetaMarker` are always written as **`true`**. Bundled **`false`** for either flag is refused in **Step 0** before this step runs — never merge or honour upstream `false` here.

The LLM backend has no per-repo selector axis — every host repo stamps co-located `<kind>/evals/<name>.test.ts` files driven by the unified LLM eval harness (`evals/llm/_shared/run-llm-suite.ts`, exported as `defineLlmEval`). There is no cross-field validation between `static.framework` and any LLM field, and no need to re-prompt for a missing TS-framework choice.

### Step 4: Build the cleanup_plan

Diff `oldSnapshot` (from Step 2) against the chosen new config and produce a `cleanup_plan` matching `templates/schema/cleanup-plan.schema.json`. The shape is byte-for-byte the same one that ``pnpm run eval:cleanup-stale -- --dry-run`` (subtask 03) emits — both producers validate against the same schema.

Group the candidate files by `reason`:

- `framework-switch` — when `oldSnapshot.static.framework !== newConfig.static.framework`. Files: the previous framework's fingerprint (`evals/conftest.py` / `vitest.config.ts` / `jest.config.{js,ts}`) plus every stamped test file that backend wrote.
- `removed-target` — when `config.ignore` or `discoveryTargets` removes a target whose generated eval JSON or co-located `<kind>/evals/<name>.test.ts` now becomes orphaned. Compare the new discovery scope to `oldSnapshot.effectiveDiscoveryTargets` (or `oldSnapshot.discoveryTargets` when YAML did not override) plus `ignore` changes; real orphan files belong here, not catalogue ghosts already stripped from `oldSnapshot.evalFiles`.

Set `totals.files` to the sum of `groups[].files.length`.

The skill emits the `cleanup_plan` payload alongside the written config (e.g. as part of the `needs_user_input` payload or a final report block). It **does not** delete any file, prompt for confirmation, or invoke ``pnpm run eval:cleanup-stale`` — those responsibilities belong to the **command**.

### Step 5: Cache invalidation for the LLM analyser (subtask 04)

When `oldSnapshot.static.framework !== newConfig.static.framework`, every cached `_meta.primitive_analysis` block in generated eval JSON is now potentially stale (the analyser's prompt depends on the active static framework — the unified LLM eval harness has no strategy axis, so framework is the only invalidating signal).

This skill stamps `_meta.primitive_analysis.invalidate = true` on every generated case row in:

- `oldSnapshot.evalFiles` (canonical filtered list from `readManifestSnapshot` — real manifest-backed assets only).
- Each skill's `evals/evals.json` enumerated under `skillsRoots`.

Subtask 04's analyser flow honours `invalidate` and re-runs the analyser regardless of `source_hash`. The skill never deletes the cache entry — it only flips the flag, so previous summaries remain visible for human review.

### Step 6: Write and validate

Write `.zoto/eval-system/config.yml` atomically (write to a temp file, then rename). Validate using `ajv` against `templates/schema/config.schema.json`. Validate the `cleanup_plan` payload against `templates/schema/cleanup-plan.schema.json`. If either validation fails, describe errors in output; if user re-entry is required, use `needs_user_input`.

Append a manifest history entry to `.zoto/eval-system/manifest.history.yml` recording the framework switch (for audit; subtask 03 records the executed deletions separately).

### Step 7: Summarise

Print the effective config, the `cleanup_plan` summary (totals + group reasons), and the next command to run: `/z-eval-configure` returns control to the command, which renders `cleanup_plan` via `askQuestion` and — on confirmation — invokes ``pnpm run eval:cleanup-stale``. After cleanup completes successfully, point the user to `/z-eval-create`.

## Conventions

- Directory: `.zoto/eval-system/` at the repository root.
- File: `config.json`.
- Contract fields: never offered as prompts from this skill.
- Manifest snapshot reader: `plugins/zoto-eval-system/engine/manifest-snapshot.ts` is the only sanctioned helper for reading the framework snapshot; do not duplicate the YAML parsing or filesystem fallback in another module.

## What NOT to Do

- Do not write to any path other than `.zoto/eval-system/config.yml` and `.zoto/eval-system/manifest.history.yml` (audit append).
- Do not mutate existing eval cases beyond stamping `_meta.primitive_analysis.invalidate = true` on generated rows when the static framework switches.
- Do not read user-authored test files; only manifest-listed `eval_files[]` and the static-framework fingerprints (`evals/conftest.py`, `vitest.config.ts`, `jest.config.{js,ts}`).
- Do **not** call `askQuestion`. The cleanup-plan confirmation is owned by the **command**, not this skill.
- Do not invoke ``pnpm run eval:cleanup-stale``. The command shells out to it after confirmation.
- Do not accept `preserveUserAuthoredCases: false` or `writeMetaMarker: false` — both are contract-level rejections.
- Do not prompt for or accept deprecated LLM-shape selector values from the payload — the unified LLM eval harness has no per-repo selector axis. If an upstream caller still bundles them, drop the fields silently rather than writing them into `config.yml`.
