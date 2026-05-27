---
name: z-eval-configure
description: Writes .zoto/eval-system/config.yml using command-owned askQuestion for every field, then spawns zoto-eval-configurer with pre-collected answers. Diffs the chosen config against the manifest snapshot (discovery_config.static), renders the resulting cleanup_plan via askQuestion, and — only on explicit confirmation — shells out to `pnpm run eval:cleanup-stale` (subtask 03) to delete stale static-framework assets. The LLM backend is single-shape (unified LLM eval harness, co-located `<kind>/evals/<name>.test.ts`) so no strategy-switch prompts are issued. Supports resume when the subagent returns needs_user_input.
---

# z-eval-configure

Interactive setup that writes `.zoto/eval-system/config.yml` and orchestrates the cleanup of stale static-framework assets when the user changes `static.framework`. **You** (the command executor) own every `askQuestion` prompt — the configurer subagent never prompts.

## Usage

```
/z-eval-configure
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect (before Task)

Run `askQuestion` for each field in this order. Use enum-backed options (no free-form unless the schema allows).

1. **Existing config** — If `.zoto/eval-system/config.yml` exists: overwrite vs cancel vs show-only.
2. **evalsDir** — default `evals` vs custom (only if schema allows).
3. **skillsRoots** — multi-select: `.cursor/skills`, `skills`, `plugins/*/skills`, custom entries.
4. **discoveryTargets** — multi-select: `skill`, `command`, `agent`, `hook`, `cli`, `lib`.
5. **`static.framework`** *(new — subtask 02)* — `pytest` / `vitest` / `jest`. Recommendation hint: pytest if the repo has Python primitives, vitest by default for TS-only repos, jest if the repo already ships jest tooling.
6. **llm.runtime** — `tsx` vs `node`.
7. **llm.model.id** — `composer-2.5` / `opus-4.6` / `sonnet`.
8. **judgeModel** — same set; default `opus-4.6`.
9. **manualChecklists.enabled** — yes / no.
10. **additionalAutomation** — none / vitest / jest / bats (multi-select).
11. **update.criticalChangeRules.*** — five yes/no toggles (defaults on).

Do **not** prompt for any per-repo LLM-backend selector or per-target TS-framework choice — the unified LLM eval harness is single-shape. Every host repo emits co-located `<kind>/evals/<name>.test.ts` files that import `defineLlmEval` from `evals/llm/_shared/run-llm-suite.ts`; the harness picks the scripted-answer or single-prompt runtime branch from each case's `requiresInteraction` flag.

Do **not** prompt for `preserveUserAuthoredCases` or `writeMetaMarker` — always `true`.

When you assemble the structured subagent payload, **never** forward `update.preserveUserAuthoredCases: false` or `update.writeMetaMarker: false` (or the same keys mirrored at the top level). Omit them or set both to **`true`** only. The configurer treats either `false` as a contract breach and **refuses before any config write** until the payload is repaired.

### Manifest snapshot — source of truth

Before spawning the subagent, read the canonical snapshot via `plugins/zoto-eval-system/engine/manifest-snapshot.ts`:

```ts
import { readManifestSnapshot } from "plugins/zoto-eval-system/engine/manifest-snapshot";
const oldSnapshot = readManifestSnapshot();
```

`oldSnapshot.source` is one of:

- `"manifest"` — values came from `.zoto/eval-system/manifest.yml -> discovery_config.static / .llm` (canonical, post-subtask-01).
- `"filesystem"` — manifest pre-dates subtask 01; `static.framework` was inferred from `evals/conftest.py` (`pytest`), `vitest.config.ts` (`vitest`), or `jest.config.{js,ts}` (`jest`). Any `llm.*` fields on a legacy snapshot are inert under the unified LLM eval harness.
- `"missing"` — no manifest at all; the cleanup_plan will be empty.

Pass `oldSnapshot` plus all collected answers in the structured payload to the subagent.

### Spawn subagent

Spawn `zoto-eval-configurer` with the structured payload (answers + `oldSnapshot`). If the payload wrongly sets `preserveUserAuthoredCases` or `writeMetaMarker` to `false`, the subagent **refuses before any write** (see **Resume loop**). Otherwise the subagent:

1. Writes `.zoto/eval-system/config.yml` atomically.
2. Diffs the new config against `oldSnapshot` and emits a `cleanup_plan` validated against `templates/schema/cleanup-plan.schema.json`.
3. Stamps `_meta.primitive_analysis.invalidate = true` on every generated case row in the manifest's `eval_files[]` when `static.framework` changed.
4. Returns the `cleanup_plan` (and any `warnings`) to the command for confirmation.

The subagent does NOT delete anything and does NOT call `askQuestion`.

### Confirm cleanup_plan (command-owned askQuestion)

If `cleanup_plan.totals.files === 0`, skip this step.

Otherwise, render each `cleanup_plan.groups[]` entry to the user via `askQuestion`:

- Header: `groups[i].summary` (or fallback `"<reason>: <from> -> <to>"`).
- Body: every `groups[i].files[].path` with its `kind` (`framework-fingerprint`, `static-test`, `llm-test`, `llm-case`, `eval-json`, `directory`, `config-snippet`).
- If `cleanup_plan.warnings[]` is non-empty, surface each warning before the confirmation question.
- Final prompt: `Apply this cleanup plan?` with options `Apply`, `Skip cleanup`, `Re-run /z-eval-configure with different choices`.

#### On `Apply`

Shell out to subtask 03's executor:

```
pnpm run eval:cleanup-stale -- --plan <stdin or temp file>
```

Subtask 03's `--dry-run` stdout MUST validate against the same `cleanup-plan.schema.json` shape so the dry-run preview and the executed plan agree byte-for-byte. The cleanup engine refuses to delete a file when `preserve_user_authored: true` and the file's `_meta.generated === true` invariant cannot be honoured.

#### On `Skip cleanup`

Note in the manifest history that the user deferred cleanup. The next `/z-eval-configure` invocation will re-detect the same drift via `oldSnapshot`.

#### On re-run

Discard the in-progress config write (or restore from backup) and re-prompt from step 1.

### Resume loop

If the final report contains `needs_user_input`, run the requested `askQuestion`(s), then **resume** the same Task with answers until config is written or aborted.

Common `needs_user_input` triggers:

- The schema rejected the cleanup_plan (e.g. unknown `kind` value introduced by a future template).
- A field required by `templates/schema/config.schema.json` is missing from the payload.

If the subagent **refuses** because the bundled answers contained `false` for `preserveUserAuthoredCases` or `writeMetaMarker`, fix the payload (remove those keys or set both `true`), then **spawn or resume** with the corrected answers — do not ask the user to weaken either flag.

## Related

- `zoto-eval-configurer` agent — wraps the configuration skill.
- `zoto-configure-evals` skill — validates config and produces the `cleanup_plan` payload.
- `templates/schema/cleanup-plan.schema.json` — the schema both this command and subtask 03 validate against.
- ``pnpm run eval:cleanup-stale`` — subtask 03's executor (built in phase 3).
- `/z-eval-create` — the next command to run after configure (and after any cleanup completes).
