# Realism rubric (Phase 2 canonical)

Locked per spec KD-1 through KD-3. Phase 3 subtasks consume `eval-rewrites.json` verbatim.

## Four scoring axes

### 1. Prompt-realism

Would a real Cursor operator paste this string into chat or the command palette?

| Class | Meaning |
| --- | --- |
| `realistic` | Reads like authentic operator text mined from transcripts or plausible daily usage. |
| `mixed` | Correct intent but awkward phrasing (third-person narration, harness vocabulary). |
| `synthetic` | Bare `/cmd` without args on non-exception paths, placeholder operator stage directions. |

### 2. Invocation-shape

| Kind | Required shape |
| --- | --- |
| `command` | `/<cmd> <realistic args>`; bare `/cmd` **only** on bare-command exception register entries. |
| `agent` | Natural-English parent-command delegation; no leading `/`. |
| `hook` | Concrete Cursor lifecycle event (`sessionStart`, invalid YAML branch, stale runs, …). |
| `skill` | Upstream-agent message that causes the skill to load (skills are not slash-invoked). |

### 3. Assertion-realism

| Class | Meaning |
| --- | --- |
| `strong` | All assertions describe user-visible outcomes (files, exit codes, on-screen text, manifest rows). |
| `mixed` | Blend of outcomes plus allowed contract assertions (see exception list). |
| `weak` | Dominated by internal-mechanic phrasing (`spawned Task`, `transcripts show`, `Inside the generator flow`). |

### 4. Coverage

At least one case per documented primitive capability (analyser hard rule 8). Coverage column in `eval-case-audit.md` marks `ok` when the source primitive's capability map is represented; gaps flagged in narrative paragraphs.

---

## Bare-command exception register (KD-2)

A case may retain bare `/cmd` **only** when listed here with a code reference.

| File | Case id | Target | Exemption | Code ref |
| --- | --- | --- | --- | --- |
| `.cursor/evals/commands/zoto-create-plugin.json` | 1 | `command:zoto-create-plugin` | documented-no-args:Usage shows bare /cmd | `1:20:.cursor/commands/zoto-create-plugin.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-create.json` | 1 | `command:z-eval-create` | precondition-abort:Eval System is not initialised… | `12:14:plugins/zoto-eval-system/commands/z-eval-create.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-create.json` | 2 | `command:z-eval-create` | documented-no-args:Usage shows bare /cmd | `12:14:plugins/zoto-eval-system/commands/z-eval-create.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-execute.json` | 1 | `command:z-eval-execute` | precondition-abort:Eval System is not initialised… | `18:24:plugins/zoto-eval-system/commands/z-eval-execute.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-help.json` | 1 | `command:z-eval-help` | precondition-abort:Eval System is not initialised… | `1:20:plugins/zoto-eval-system/commands/z-eval-help.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-init.json` | 1 | `command:z-eval-init` | documented-no-args:Usage shows bare /cmd | `1:20:plugins/zoto-eval-system/commands/z-eval-init.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-judge.json` | 1 | `command:z-eval-judge` | precondition-abort:Eval System is not initialised… | `18:24:plugins/zoto-eval-system/commands/z-eval-judge.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-jump.json` | 2 | `command:z-eval-jump` | precondition-abort:Eval System is not initialised… | `18:24:plugins/zoto-eval-system/commands/z-eval-jump.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-operator.json` | 2 | `command:z-eval-operator` | precondition-abort:Eval System is not initialised… | `18:24:plugins/zoto-eval-system/commands/z-eval-operator.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-start.json` | 1 | `command:z-eval-start` | documented-no-args:Usage shows bare /cmd | `1:20:plugins/zoto-eval-system/commands/z-eval-start.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-update.json` | 8 | `command:z-eval-update` | precondition-abort:Eval System is not initialised… | `18:24:plugins/zoto-eval-system/commands/z-eval-update.md` |
| `plugins/zoto-eval-system/evals/commands/z-eval-workflow.json` | 1 | `command:z-eval-workflow` | precondition-abort:Eval System is not initialised… | `1:20:plugins/zoto-eval-system/commands/z-eval-workflow.md` |
| `plugins/zoto-spec-system/evals/commands/z-spec-create.json` | 1 | `command:z-spec-create` | precondition-abort:Eval System is not initialised… | `12:14:plugins/zoto-spec-system/commands/z-spec-create.md` |
| `plugins/zoto-spec-system/evals/commands/z-spec-create.json` | 2 | `command:z-spec-create` | precondition-abort:Eval System is not initialised… | `12:14:plugins/zoto-spec-system/commands/z-spec-create.md` |
| `plugins/zoto-spec-system/evals/commands/z-spec-create.json` | 3 | `command:z-spec-create` | precondition-abort:Eval System is not initialised… | `12:14:plugins/zoto-spec-system/commands/z-spec-create.md` |
| `plugins/zoto-spec-system/evals/commands/z-spec-create.json` | 4 | `command:z-spec-create` | precondition-abort:Eval System is not initialised… | `12:14:plugins/zoto-spec-system/commands/z-spec-create.md` |
| `plugins/zoto-spec-system/evals/commands/z-spec-create.json` | 5 | `command:z-spec-create` | precondition-abort:Eval System is not initialised… | `12:14:plugins/zoto-spec-system/commands/z-spec-create.md` |
| `plugins/zoto-spec-system/evals/commands/z-spec-execute.json` | 1 | `command:z-spec-execute` | precondition-abort:Eval System is not initialised… | `1:40:plugins/zoto-spec-system/commands/z-spec-execute.md` |
| `plugins/zoto-spec-system/evals/commands/z-spec-judge.json` | 1 | `command:z-spec-judge` | precondition-abort:Eval System is not initialised… | `1:40:plugins/zoto-spec-system/commands/z-spec-judge.md` |

---

## Contract-assertion exception list (KD-3)

These internal-mechanic families **may remain** because they encode hard contracts:

| Family | Contract encoded | Source |
| --- | --- | --- |
| `_meta.generated: true` | Case-level regenerability guard | `_user-case-guards.ts` |
| `// _meta.generated\: true` (line 1, TS tests) | File-level guard with 20-line backwards scan | `_user-case-guards.ts` |
| `# _meta.generated\: True` (line 1, pytest) | File-level guard | `_user-case-guards.ts` |
| Exact precondition refuse strings | Command abort messages shipped in command markdown | e.g. `plugins/zoto-eval-system/commands/z-eval-create.md` |
| `source_hash` 64-hex SHA-256 | Analyser payload invariant | `analyser-payload.schema.json` |
| `schema_version: 1`, colon-prefixed `target_id`, `additionalProperties: false` | Analyser envelope invariants | `analyser-payload.schema.json` |
| `manifest.history.yml` append-only | History never compacted or mutated | Eval System manifest contract |
| `fixture_justifications[]` cardinality | Justified fixture overlays when `fixtures.files[]` non-empty | Analyser hard rule 6 |
| Comparer `/canvas` template byte-equality | `agent:zoto-eval-comparer` target-specific contract | `templates/canvas/compare-prompt.md.tmpl` |
| `needs_user_input` payload shape | Subagent escalation schema | `needs-user-input.schema.json` |
| Hook stdout JSON + `additional_context` + exit 0 + `{}` early return | Cursor hooks contract | Hook primitive docs |

All other internal-mechanic assertions are rewritten to user-visible equivalents in `eval-rewrites.json`.

---

## Worked before / after examples

### `command:z-eval-create` case 2

**Before prompt:** `/z-eval-create`

**After prompt:** `Scaffold evals for this repo — approve all skills, plugin commands, plugin agents, and hook bundles from the checklists.`

**Before assertion (weak):** `The spawned Task named zoto-eval-generator referenced the zoto-create-evals skill…`

**After assertion (strong):** `After scaffolding completes, `.zoto/eval-system/manifest.yml` lists every operator-approved target and the closing guidance mentions pnpm validation gates.`

### `agent:zoto-eval-generator` case 2

**Before prompt:** `You spawned from /z-eval-create; the preceding command fused approval lists…`

**After prompt:** `I ran /z-eval-create, approved skills/commands/agents/hooks, and config.yml is present. Scaffold the eval suite…`

**Before assertion (weak):** `Available transcripts show zero askQuestion tool emissions from the generator.`

**After assertion (contract + outcome):** `The agent returns structured needs_user_input (when configuration is missing) without emitting askQuestion from the subagent loop.`

### `hook:zoto-eval-system` case 1

**Prompt:** unchanged (already lifecycle-realistic).

**Assertion tightening:** focus on exit 0 and stdout `{}` JSON shape rather than transcript-side timestamp observations.

---

## Redaction call site

`generate-phase2-audit.ts` imports `redact` from `audit/redact.ts` and applies it to every `rewrite_prompt`, `rewrite_follow_ups[]`, and `rewrite_expected_output` before writing `eval-rewrites.json`.
