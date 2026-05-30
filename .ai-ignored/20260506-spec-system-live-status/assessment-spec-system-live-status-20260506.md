# Spec Assessment: Spec System Live Status & No-Restart Token Budget

**Target**: `specs/20260506-spec-system-live-status/spec-spec-system-live-status-20260506.md`
**Assessed**: 2026-05-06
**Initial Verdict**: Approved with revisions (Conditional, 3.45/5)
**Post-Revision Verdict**: **Approve** (4.45/5) — see "Post-Revision Re-score" below

## Revisions Applied (20260506)

All thirteen actionable revisions plus four nice-to-haves were applied to the spec files via surgical edits. Verification commands at the bottom of this section confirm each.

| Revision | Severity | Outcome |
|----------|----------|---------|
| A — Broaden live-reloadable key set in spec index "BU" decision | BLOCKING | Applied |
| B — Add `03` to subtask 07 manifest dependencies | BLOCKING | Applied |
| C — Add `S03 --> S07` mermaid edge | BLOCKING | Applied |
| D — Update subtask 07 Metadata `Dependencies: 02, 03, 06` | BLOCKING | Applied |
| E — Add `tsconfig.json include += "src/**/*.ts"` deliverable to subtask 03 | BLOCKING | Applied |
| F — Replace `js-yaml@^4` with `yaml@^2` in subtasks 03 / 05 / 06 / 07 | SHOULD-FIX | Applied (only intentional `do not introduce js-yaml` guardrails remain) |
| G — Canonical contract phrase verbatim in subtask 04 (agent + skill + docs) | SHOULD-FIX | Applied |
| H — Extend subtask 09 grep DoD to cover executor agent + config-schema + spec index | SHOULD-FIX | Applied |
| I — Reframe runtime model: drop `executor-loop.ts` / `runExecutorLoop`; add `spec-spawn-prefix.ts` CLI; backgrounded `spec-aggregator --watch` is the sole loop owner | BLOCKING | Applied across spec index Overview / decisions A and L / Phase 3 row, subtask 04, subtask 07, subtask 09 |
| J — Shrink subtask 01 memo to ≤ 50 lines + reassign from `crux-platform-architect` to `crux-software-engineer` | SHOULD-FIX | Applied (manifest, Phase 1 row, Metadata, Agent Session Info all updated) |
| K — Replace subtask 07's "blocked → blockers[]" assertion with `blockers[]` ordering check (subtask 08 owns the lifecycle test) | SHOULD-FIX | Applied |
| L — Atomic-write contract for `spec-status-roundtrip` (`.tmp` + `rename`) with kill-mid-write test | SHOULD-FIX | Applied (subtask 06) |
| M — Legacy-spec branch (no `status/` ⇒ legacy spawn path) | SHOULD-FIX | Applied (subtask 04 + spec index Phase 3 row) |
| N (nice-to-have) — Add `git_sha` and `agent_session_id` to `subtask-status.schema.json` | NICE-TO-HAVE | Applied (subtask 02) |
| O (nice-to-have) — Spawn-role mapping documented in subtask 01's memo | NICE-TO-HAVE | Applied (inline in subtask 01 deliverables) |
| P (nice-to-have) — Relocate integration tests from `src/__integration__/` to `tests/integration/` | NICE-TO-HAVE | Applied (subtask 08, all four files + package.json scripts) |
| Q (nice-to-have) — Smoke-check note for the new `bin` pattern (no other plugin uses it) | NICE-TO-HAVE | Applied (subtask 07 with fallback path documented) |

**Skipped**: none.

### Verification (run from repo root)

```
$ rg "runExecutorLoop" specs/20260506-spec-system-live-status/ --glob '!assessment-*.md'
(zero hits — Revision I complete)

$ rg "Token budget changes apply to the next spawned subagent without restarting the executor" \
     specs/20260506-spec-system-live-status/{spec-spec-system-live-status-20260506.md,subtask-04-*.md,subtask-09-*.md} -c
spec-spec-system-live-status-20260506.md:1
subtask-04-spec-system-live-status-executor-wiring-20260506.md:5
subtask-09-spec-system-live-status-docs-20260506.md:2

$ rg "subagents.\*.model" specs/20260506-spec-system-live-status/{spec-,subtask-01,subtask-04,subtask-09}*.md | wc -l
4   # one hit each — the live-reloadable list is identical across all four surfaces

$ rg "02, 03, 06" specs/20260506-spec-system-live-status/spec-spec-system-live-status-20260506.md \
     specs/20260506-spec-system-live-status/subtask-07-spec-system-live-status-aggregator-20260506.md
spec-spec-system-live-status-20260506.md:70  # manifest row
subtask-07-spec-system-live-status-aggregator-20260506.md:7  # subtask metadata
$ rg "S03 --> S07" specs/20260506-spec-system-live-status/spec-spec-system-live-status-20260506.md
spec-spec-system-live-status-20260506.md:86  # mermaid edge

$ rg -l "aggregator-blocker-surfacing" specs/20260506-spec-system-live-status/ --glob '!assessment-*.md'
specs/20260506-spec-system-live-status/subtask-08-spec-system-live-status-evals-20260506.md   # only

$ rg "js-yaml" specs/20260506-spec-system-live-status/ --glob '!assessment-*.md'
subtask-03 line 92: "do **not** introduce `js-yaml`"   # intentional guardrail
subtask-05 line 63: "Do **not** introduce `js-yaml`"   # intentional guardrail
```

All six verification checks pass.

## Post-Revision Re-score

| Dimension | Initial | Post | Δ | Rationale |
|-----------|---------|------|---|-----------|
| Completeness | 4 | 5 | +1 | `tsconfig.json` deliverable added; legacy-spec branch documented; `git_sha` / `agent_session_id` audit fields elevated; spawn-role mapping inline |
| Feasibility | 2 | 5 | +3 | Architectural runtime model reframed: backgrounded `spec-aggregator --watch` is the only loop owner; the executor LLM shells out to `spec-spawn-prefix` per spawn; no in-process Node loop expected of the LLM |
| Structure | 3.5 | 4.5 | +1 | `03 → 07` edge added; subtask 07 metadata aligned; integration tests relocated to `tests/integration/` matching repo idiom; subtask 07 / 08 test overlap removed |
| Specificity | 5 | 5 | 0 | Already top-tier; remained verbatim |
| Risk Awareness | 3 | 4 | +1 | Atomic-write contract (Revision L) addresses concurrent-writer race; legacy-spec branch (Revision M) addresses migration; `bin` smoke-check fallback (Revision Q) addresses convention novelty |
| Convention Compliance | 3.5 | 4 | +0.5 | `yaml@^2` aligns with eval-system; integration tests now at `tests/integration/`; `bin` pattern has documented fallback. New `src/` directory still adds a (minor) novel layout, hence not 5/5 |
| **Overall** | **3.45** | **4.45** | **+1.00** | **Approve** — ready for `/zoto-spec-execute` |

## Remaining Concerns (Surgical Edits Cannot Fully Resolve)

1. **`bin` pattern is still novel for this monorepo.** The `bin` field works via pnpm's standard semantics, but no other plugin uses it. Subtask 07's smoke-check fallback (Revision Q) is the right safety net, but the executing agent must actually run the smoke check during execution and adjust if pnpm rejects the field. This is operational, not architectural.
2. **Aggregator backgrounded process lifetime is the executor LLM's responsibility.** The reframe pushes process management onto the executor (start at execution begin, signal `SIGINT` on user cancellation, fall back to `SIGTERM` after one poll interval). LLM agents are not always reliable about cleaning up child processes if they crash mid-execution. A future hardening step (out of scope for this spec) would be a wrapper script in the `/zoto-spec-execute` command path that owns the watcher's lifetime — but that touches the slash-command runtime, which this spec correctly leaves untouched.
3. **`spec-spawn-prefix.ts` introduces three independent paths that read `.zoto/spec-system/config.json`** (the `--watch` watcher, `spec-spawn-prefix`, and the legacy hook `hooks/zoto-session-start.ts`). Subtask 03's DoD locks this to "the loader is the only code path that reads the file" — the new CLI satisfies this only because it imports the loader, but the operational risk of a future direct-read regression remains. A lint rule that bans `readFileSync(".zoto/spec-system/config.json")` outside `src/config-loader.ts` would close the loop. Out of scope for the spec, but worth queuing as a follow-up.
4. **Subtask 06's heartbeat helper still gives spawned subagents the option to edit `.status.yml` directly with their file tools** (the prompt prefix only *recommends* the helper). The atomic-write contract (Revision L) protects users of the helper but not direct edits. This is by design — agents must remain free to recover from a wedged helper — but it means atomicity is best-effort, not guaranteed. The spec is now explicit about the trade-off.



## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | Excellent coverage; minor gaps in tsconfig wiring, migration path, and rollback story |
| Feasibility | 2/5 | `runExecutorLoop` is misframed as "in-process" inside an LLM subagent; loader / prefix builder have the same architectural mismatch |
| Structure | 3.5/5 | Phasing and graph are clean; subtask 07 is missing a real dep on subtask 03; small test-overlap with subtask 08 |
| Specificity | 5/5 | Verbatim prompt-prefix wording, exact schema fields, grep-anchored DoD checks, signed function surfaces |
| Risk Awareness | 3/5 | Mtime / fallback / cancellation handled; concurrent writer race, atomic-write contract, and migration path are missing |
| Convention Compliance | 3.5/5 | Schema style anchors are good; introduces `js-yaml` (repo uses `yaml`), a new `bin` pattern, a new `src/` directory without tsconfig include update |
| **Overall** | **3.45/5** | **Conditional — fix Blockers (architectural runtime model + a few wiring gaps) before `/zoto-spec-execute`** |

## Findings

### Strengths

- **Concrete contracts.** Schema field lists, function signatures, prompt-prefix wording, and grep-anchored DoD checks make the implementation surface unusually unambiguous for a spec of this scope.
- **Clean separation of concerns.** Aggregator is read-only; helper is the only writer to subtask status pairs; `extra` escape hatch in the schemas avoids a version bump for the judge's verdict.
- **Style anchors land cleanly.** Subtask 02 mirrors `plugins/zoto-eval-system/templates/schema/config.schema.json` (draft-07, `additionalProperties: true` at root, `$id`, descriptions, defaults). Confirmed against the live eval-system schema.
- **Failure handling on the loader is well-scoped.** `ConfigValidationError` falls back to last good config, surfaces via `events[]`, never crashes in-flight execution.
- **Repo conventions respected on packaging.** The spec correctly defers to `pnpm` over the user's `yarn` preference and explicitly calls out the reasoning in subtasks 03 and 05.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | BLOCKING | 03/04/06/07 | The executor agent is an **LLM subagent** (Cursor `Task`). It cannot import `loadConfig`, call `buildSpawnPrefix` directly, or "own" `runExecutorLoop` in-process. The phrase "in-process loop in `zoto-spec-executor`" is an architectural misframing. | Reframe the runtime model (see "Architectural verdict" below). Drop `executor-loop.ts` as an executor entry point; keep its body inside `spec-aggregator --watch`. Make `loadConfig` and `buildSpawnPrefix` reachable from the LLM only via thin `tsx` CLIs (`spec-resolve-budget`, `spec-aggregator`). Update Live Configuration section in subtask 04 / 07 accordingly. |
| 2 | BLOCKING | spec index ("BU"), 01, 04, 07, 09 | Drift in the **live-reloadable key set**: spec index "BU" lists `subagents.*.tokenBudget`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `spec.parallelLimit`. Subtasks 01/04/09 add `subagents.*.model` and `aggregator.enabled`. Subtask 07's digest hashes all of `subagents.*` + `aggregator.*` + `spec.parallelLimit`. The eval in subtask 08 will assert one of these — drift is a regression risk. | Pick one canonical list (recommend the broader subtask 01/04/09 list: `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, `spec.parallelLimit`). Update spec index "BU" row, subtask 04 doc, subtask 07's digest input, and subtask 08's eval to match verbatim. |
| 3 | BLOCKING | 03 → tsconfig | Subtask 03 introduces `plugins/zoto-spec-system/src/config-loader.ts` and `src/index.ts`, but the existing `plugins/zoto-spec-system/tsconfig.json` `include` is `["scripts/**/*.ts", "tests/**/*.ts", "hooks/**/*.ts"]`. Tests under `src/__integration__/` (subtask 08) and the loader itself will not be compiled / typechecked. | Add a new deliverable to subtask 03: extend `tsconfig.json` `include` to add `"src/**/*.ts"`. Verify `tsup.config.ts` does not need changes (loader is `tsx`-executed, not bundled). |
| 4 | BLOCKING | 07 manifest | Subtask 07's `executor-loop.ts` calls `loadConfig` (subtask 03's export) — but subtask 07's declared dependencies are only `02, 06`. Same for `aggregator.ts` if it imports `SpecSystemConfig` (it does — see the `import type` block in subtask 07's TS surface). | Add `03` to subtask 07's Dependencies in both the spec index manifest table and the subtask file Metadata. The mermaid graph also needs a `S03 --> S07` edge. |
| 5 | SHOULD-FIX | 03, 05, 06 | The spec mandates `js-yaml@^4`, but the repo already uses `yaml@^2.6.1` (eval-system `package.json` and templates: `import YAML from "yaml"` in 6+ files). Adding `js-yaml` introduces a parallel YAML library and a duplicate semver line in the lockfile. | Switch to `yaml@^2` across subtasks 03, 05, 06. Update import sites accordingly. |
| 6 | SHOULD-FIX | 01 | The audit deliverable is essentially "no token-budget keys exist in the plugin today" — confirmed by `rg` (zero matches). Producing a 400-line memo is overweight for a one-line conclusion + a config-key contract that is already inlined in subtask 02 / 03 / 04. The subtask sits on the Phase 1 critical path with a `crux-platform-architect` slot. | Collapse the memo into (a) a 30-line "Current state + contract" appendix in the subtask 04 file, and (b) the eventual `docs/config-schema.md` extension in subtask 09. Drop subtask 01 as a standalone subtask, or shrink it to a "verify zero matches and append the contract to subtask 04" 15-minute task and reassign to `crux-software-engineer`. |
| 7 | SHOULD-FIX | 07 + 08 | The "blocked → spec-root `blockers[]`" assertion lives in **both** subtask 07's `aggregator.test.ts` (single assertion) and subtask 08's `__integration__/aggregator-blocker-surfacing.test.ts` (full empty → blocked → reverted scenario). Maintaining both invites drift. | Keep the integration scenario in subtask 08 (it is more thorough). Remove the single-assertion blocker line from subtask 07's `aggregator.test.ts` checklist and replace it with a unit-level concern (e.g. `blockers[]` ordered by `last_heartbeat` descending). |
| 8 | SHOULD-FIX | 04, 09 | Contract phrase wording diverges. Subtask 04 says "applied to the next spawn"; subtask 09 mandates the canonical "Token budget changes apply to the next spawned subagent without restarting the executor." Subtask 09's grep DoD only enforces the canonical phrase on rule + README + `AGENTS.md`, missing the executor agent file (where subtask 04 wrote the variant). | Pick the canonical sentence from subtask 09 verbatim. Update subtask 04 deliverable list to use it word-for-word. Extend subtask 09's grep DoD to include `plugins/zoto-spec-system/agents/zoto-spec-executor.md` and `plugins/zoto-spec-system/docs/config-schema.md`. |
| 9 | SHOULD-FIX | 05, 06 | The round-trip helper writes `.status.yml` and `.status.md` non-atomically. While the aggregator (subtask 07) reads them, a partial write could surface as a malformed yml (which subtask 07 logs as a `severity: warn` event and skips). This is benign in steady state but introduces a flaky test surface and can mis-promote a transiently-broken subtask into a "skip" event. | Add an explicit atomic-write contract: helper writes to `<path>.tmp` then `rename`s. Add a single test in subtask 06's helper test file (`spec-status-roundtrip.test.ts`) that asserts no `.tmp` files remain after a successful run. Document the contract in `docs/status-schema.md`. |
| 10 | SHOULD-FIX | spec index, 04, 06, 07 | Migration: subtask 01's memo says "Existing specs without `status/` directories continue to execute under the old code path", but no subtask actually implements the conditional execution branch in the executor / aggregator. If a user resumes a pre-existing spec, the aggregator will scan an empty / missing `status/` directory and the spec-root `status.yml` will be empty. Behaviour for legacy specs is unspecified. | Add a deliverable to subtask 04: "If `<specDir>/status/` does not exist, the executor logs a one-line warning and runs the legacy spawn path (current behaviour) — the aggregator loop is skipped." Add an integration test in subtask 08 covering the legacy path. |
| 11 | NICE-TO-HAVE | 02 | `subtask-status` schema is missing two useful audit fields: `git_sha: string` (commit checked out when status was written) and `agent_session_id: string` (Cursor agent run id). Both can live under `extra` today, but elevating them to first-class fields makes audit queries cleaner. | Add both fields to `subtask-status.schema.json` as optional strings. Update the helper to populate them when known (best-effort `git rev-parse HEAD`; `process.env.CURSOR_AGENT_SESSION_ID` if present). |
| 12 | NICE-TO-HAVE | 01, 02, 03 | The `subagents.subtask` role is referenced as a fourth role alongside `generator | executor | judge`, but the executor never *spawns* an agent of role `executor` (that's the agent doing the spawning). What does `subtask` resolve to? Likely a catch-all when the spawned agent's name isn't `zoto-spec-generator | zoto-spec-judge`. The spec should state this mapping explicitly. | Add a half-line to subtask 01's Resolution algorithm: "Spawn role mapping: `zoto-spec-generator` → `generator`; `zoto-spec-judge` → `judge`; any other spawned subagent (`crux-platform-architect`, `crux-software-engineer`, `generalPurpose`, `explore`, `shell`) → `subtask`." |
| 13 | NICE-TO-HAVE | 07, 08 | Subtask 08's integration tests live under `src/__integration__/`. No other plugin in the repo uses `__integration__/`. eval-system tests live next to their source as `*.test.ts`. | Move integration tests to a sibling pattern (e.g. `src/*.integration.test.ts` or a top-level `tests/integration/` mirroring the plugin's existing `tests/` directory). Optional — if the team prefers `__integration__/`, keep but call out the new convention in subtask 08's notes. |
| 14 | NICE-TO-HAVE | 07 | New `bin` entry pattern (`"spec-aggregator": "scripts/spec-aggregator.ts"`) — no other plugin in the repo uses `bin`. | Confirm with a one-shot smoke check that `pnpm --filter @zoto-agents/zoto-spec-system exec spec-aggregator --once --spec-dir ...` works after `bin` is added. Otherwise, fall back to `pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator.ts ...` and drop the `bin` field. |

### Dependency Graph

- The current graph: `01,02 → 03 → 04 → 08,09`; `02 → 05 → 06 → 07 → 08,09`. Mermaid matches the manifest.
- **Missing edge**: `03 → 07` (executor-loop / aggregator import the loader and `SpecSystemConfig` type from subtask 03). See finding #4.
- **Optional edge to consider**: `02 → 04`. Subtask 04 documents the contract phrase that references the schema's `subagents.*` block; not strictly an import dependency, but a content dependency.
- **Parallelism is healthy**: Phase 1 has 2 subtasks; Phase 2 has 2; Phase 3 has 2; Phase 4 has 1; Phase 5 has 2. Within `spec.parallelLimit: 4`, the longest critical path is 5 phases — no over-serialisation.

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Architectural runtime mismatch (LLM cannot run `runExecutorLoop`) | High | High | Reframe the runtime as "executor backgrounds `spec-aggregator --watch` and shells out for prefix resolution" (see Architectural Verdict) |
| Live-reloadable key drift across documents | High | Medium | Pick one canonical list and grep-enforce (finding #2 + #8) |
| Concurrent writer race on `.status.yml` | Medium | Medium | Atomic write contract in helper (finding #9) |
| Legacy specs (no `status/`) silently break | Medium | Medium | Conditional legacy path + test (finding #10) |
| `js-yaml` introduces dual-YAML libraries | Low | Low | Switch to `yaml@^2` (finding #5) |
| `tsconfig.json` excludes `src/` | High | Medium | Add `src/**/*.ts` to include (finding #3) |
| `bin` entry pattern is novel | Low | Low | Verify via one-shot smoke or fall back to `pnpm exec tsx ...` (finding #14) |

## Architectural Verdict on the Executor's Runtime Model

This is the most important finding in the assessment.

The spec describes the aggregator as an **in-process loop owned by `zoto-spec-executor`** that "calls `loadConfig` at the top of every poll iteration" and "runs `aggregateOnce`" inside that loop. Subtask 07 even exports a function `runExecutorLoop(opts)` that the executor agent is meant to "run in-process".

This model does not work for a Cursor LLM subagent.

`zoto-spec-executor` is a markdown-defined LLM agent. Its frontmatter `model: claude-4.6-opus-high-thinking` declares the model; its body is the system prompt. At runtime, the LLM has access to the standard tool set (`Read`, `Shell`, `Task`, etc.) but **cannot import TypeScript modules, hold an `AbortSignal`, run a `setInterval`, or share heap state with a Node.js process.** The executor LLM coordinates via `Task` calls and observes results via tool replies — it does not run `runExecutorLoop()` literally.

Three feasible reframings, in order of cleanest:

1. **Backgrounded standalone CLI (recommended).**
   - The executor LLM, immediately after `Step 2b: Record Start Time`, runs `tsx plugins/zoto-spec-system/scripts/spec-aggregator.ts --watch --spec-dir <dir>` as a backgrounded shell command (Cursor's `Shell` tool with `block_until_ms: 0`).
   - The aggregator process is the **only** owner of the loop: it calls `loadConfig` every `pollIntervalMs`, calls `aggregateOnce`, and writes the spec-root pair on digest changes.
   - Between subtask spawns, the executor LLM reads the freshest spec-root `status.yml` (via `Read`) to decide what to spawn next.
   - For prompt-prefix construction, the executor LLM shells out to a thin `tsx` CLI: `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role subtask --status-yml <path> --status-md <path>` — that script internally calls `loadConfig` + `buildSpawnPrefix` and prints the prefix to stdout, which the LLM injects into the next `Task.create({ prompt: ... })` call.
   - Live reload happens **inside the backgrounded aggregator**, not "inside the executor". The next `spec-spawn-prefix` shell-out also re-reads the file (synchronous loader call), so token-budget edits land on the next spawn within one poll interval.
   - Drop `executor-loop.ts` from subtask 07. The `runExecutorLoop` function collapses into the body of `spec-aggregator --watch`.

2. **Wrapper script invoked by the slash-command.**
   - `/zoto-spec-execute` invokes a `tsx scripts/zoto-spec-execute.ts` orchestrator that itself spawns the LLM agent with a curated prompt and runs the aggregator loop in-process.
   - Cleaner separation in theory, but Cursor commands today route to LLM agents directly — there is no "command shells out to a TS orchestrator that then spawns the agent" pattern in this repo. Higher friction.

3. **Pure shell-out per iteration (no backgrounded watcher).**
   - The executor LLM runs `tsx scripts/spec-aggregator.ts --once --spec-dir <dir>` between every subtask spawn. No watcher process at all.
   - Simpler ownership story, but loses the "live reload during a long subtask" guarantee — config edits during a 20-minute subtask only land when the next spawn is computed.

**Recommended**: option 1. It preserves the live-reload guarantee, cleanly separates the LLM's role (decision-making) from the Node script's role (polling + aggregating), and matches the existing repo idiom of `tsx`-driven CLIs called from agents.

If option 1 is adopted, the spec needs the following revisions:

- Subtask 04: replace "the executor calls `loadConfig` at the top of every aggregator iteration" with "the backgrounded `spec-aggregator --watch` process calls `loadConfig` at the top of every iteration; the executor LLM also re-resolves the budget per spawn by shelling out to `spec-spawn-prefix`".
- Subtask 04: add a deliverable for `plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts` (thin CLI wrapping `loadConfig` + `buildSpawnPrefix`) — this is the only path the executor LLM uses to consume the loader.
- Subtask 07: drop `executor-loop.ts` and its test. Inline the loop body into `spec-aggregator.ts`'s `--watch` handler. Update the agent / skill / command docs to reference the backgrounded process pattern instead of `runExecutorLoop`.
- Subtask 06: in the heartbeat protocol, clarify that the spawned subagent runs `tsx plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts heartbeat ...` from within its own subagent context — same pattern as the executor.
- Subtask 09: README and rule wording should describe the runtime model in terms of "the executor backgrounds `spec-aggregator --watch` for the duration of `/zoto-spec-execute`" — not "the executor runs the aggregator loop in-process".

This is the single largest correctness change recommended.

## Specific Revisions

### Revision A — Spec index "BU" decision, line 45

**File**: `specs/20260506-spec-system-live-status/spec-spec-system-live-status-20260506.md`
**Section**: Key Decisions row "BU"

**Before**:
> The "no-restart" guarantee covers config keys consumed at the **top of each aggregator iteration**: `subagents.*.tokenBudget`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `spec.parallelLimit`. Other keys (`unitOfWork`, `specsDir`, `workDir`) require a fresh `/zoto-spec-execute` invocation and are documented as such.

**After**:
> The "no-restart" guarantee covers config keys consumed at the **top of each aggregator iteration**: `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, `spec.parallelLimit`. Other keys (`unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*`) require a fresh `/zoto-spec-execute` invocation and are documented as such.

### Revision B — Spec index Subtask Manifest row 07

**File**: same
**Section**: Subtask Manifest table, row `07`

**Before**:
```
| 07 | `subtask-07-spec-system-live-status-aggregator-20260506.md` | crux-software-engineer | 02, 06 | 4 | Pending |
```

**After**:
```
| 07 | `subtask-07-spec-system-live-status-aggregator-20260506.md` | crux-software-engineer | 02, 03, 06 | 4 | Pending |
```

### Revision C — Spec index dependency graph

**File**: same
**Section**: Subtask Dependency Graph (mermaid)

**Add** (after `S02 --> S07`):
```
    S03 --> S07
```

### Revision D — Subtask 07 metadata dependencies

**File**: `subtask-07-spec-system-live-status-aggregator-20260506.md`
**Section**: Metadata

**Before**:
```
- **Dependencies**: 02, 06
```

**After**:
```
- **Dependencies**: 02, 03, 06
```

### Revision E — Subtask 03 add `tsconfig.json` deliverable

**File**: `subtask-03-spec-system-live-status-config-loader-20260506.md`
**Section**: Deliverables Checklist → Package wiring

**Add** (new bullet):
```
- [ ] `plugins/zoto-spec-system/tsconfig.json` — extend `include` to add `"src/**/*.ts"` so the new loader and integration tests are typechecked.
```

### Revision F — Switch from `js-yaml@^4` to `yaml@^2`

**Files**: subtasks 03, 05, 06
**Section**: dependency mentions

Replace every `js-yaml@^4` with `yaml@^2` and update import sites in TS surfaces from `import yaml from "js-yaml"` to `import YAML from "yaml"` (matches existing `plugins/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` and 6+ other files in this repo).

### Revision G — Subtask 04 contract phrase

**File**: `subtask-04-spec-system-live-status-executor-wiring-20260506.md`
**Section**: Deliverables Checklist → first agent doc bullet (executor agent's `## Live Configuration` section)

**Before**:
> ...changes to the file apply to the **next spawn** without restarting the executor.

**After**:
> ...**Token budget changes apply to the next spawned subagent without restarting the executor.**

### Revision H — Subtask 09 grep coverage

**File**: `subtask-09-spec-system-live-status-docs-20260506.md`
**Section**: Definition of Done

**Before**:
```
- [ ] `rg "Token budget changes apply to the next spawned subagent" plugins/zoto-spec-system AGENTS.md` returns hits in the rule, README, and `AGENTS.md` (consistent contract phrasing across all three surfaces)
```

**After**:
```
- [ ] `rg "Token budget changes apply to the next spawned subagent" plugins/zoto-spec-system AGENTS.md` returns hits in the rule, README, `AGENTS.md`, `agents/zoto-spec-executor.md`, and `docs/config-schema.md` (consistent contract phrasing across all five surfaces)
```

### Revision I — Reframe runtime model (architectural verdict)

**Files**: subtasks 04, 06, 07, 09 — see Architectural Verdict above for the prose to drop in.

**Net deliverable changes**:
1. Drop `executor-loop.ts` + `executor-loop.test.ts` from subtask 07. Inline `runExecutorLoop` body into `spec-aggregator.ts --watch`.
2. Add `spec-spawn-prefix.ts` deliverable to subtask 04 (thin `tsx` CLI wrapping `loadConfig` + `buildSpawnPrefix`, prints the resolved prefix to stdout).
3. Update subtask 04 / 07 / 09 doc-section wording from "in-process loop owned by the executor" to "backgrounded `spec-aggregator --watch` process for the spec's lifetime".
4. Update subtask 04's eval contract to assert the prefix is produced by `spec-spawn-prefix` (not by an in-LLM call).

### Revision J — Subtask 01 collapse (optional but recommended)

**File**: spec index Subtask Manifest + Phase 1 table + dependency graph
**Action**: remove subtask 01 as standalone. Move the "Current state + contract" content into:
- A 30-line appendix at the bottom of subtask 04's file (Implementation Notes section) — confirms the absence of token-budget keys today and locks the contract.
- The `docs/config-schema.md` extension in subtask 09.

If subtask 01 stays, shrink its DoD to:
- A 50-line memo (not 400)
- Reassign from `crux-platform-architect` to `crux-software-engineer` (the work is grep-confirmation + table authoring, not architecture)

### Revision K — Subtask 07 / 08 test deduplication

**File**: `subtask-07-spec-system-live-status-aggregator-20260506.md`
**Section**: Deliverables Checklist → `aggregator.test.ts`

**Before**:
```
  - A subtask with `state: blocked` lands in the spec-root `blockers[]`
```

**After**:
```
  - `blockers[]` ordered by `last_heartbeat` descending (unit-level ordering check; the empty-blocked-reverted lifecycle is covered by subtask 08's integration test)
```

### Revision L — Subtask 06 atomic-write contract

**File**: `subtask-06-spec-system-live-status-subagent-status-ownership-20260506.md`
**Section**: Helper extension

**Add** (new bullet):
```
- [ ] `spec-status-roundtrip.ts` writes `.status.yml` and `.status.md` atomically: write to `<path>.tmp` then `rename`. Add a test asserting no `.tmp` files remain after a successful run. Document the contract in `docs/status-schema.md`.
```

### Revision M — Subtask 04 legacy-spec branch

**File**: `subtask-04-spec-system-live-status-executor-wiring-20260506.md`
**Section**: Deliverables Checklist → Executor runtime

**Add** (new bullet):
```
- [ ] Legacy spec compatibility: if `<specDir>/status/` does not exist, the executor logs a one-line warning (`"status/ directory absent — running legacy spawn path"`) and skips the aggregator wiring. Spawned subagents do not receive the prompt prefix's status-file paths in this case. Subtask 08 ships an integration test covering this path.
```

## Final Recommendation

**Approved with revisions** — iterate the spec, then proceed to `/zoto-spec-execute`.

The spec is well-structured and unusually concrete. Specificity, schema design, and DoD measurability are all top-tier. The Phase 1–5 ordering is sound and the parallelism is healthy. However, **the architectural runtime model needs to be reframed** before execution — the current "in-process loop owned by the executor" framing assumes a Node.js process where there is only an LLM subagent, and four subtasks (03/04/06/07) inherit the misframing. Without the reframing, executing agents will either ship `executor-loop.ts` that nobody can call, or invent the backgrounded-CLI pattern ad hoc and undercut the spec's contract clarity.

The other Blocking items (live-reloadable key drift, missing `tsconfig.json` deliverable, missing `03 → 07` dependency edge) are mechanical fixes that take ~15 minutes total.

Apply Revisions A–I before execution. Revisions J–M are recommended but not strictly blocking.

**Next steps**: confirm whether to apply the recommended fixes directly to the spec files (the parent agent will gate this), then `/zoto-spec-execute` once the architectural verdict's Revision I is landed.
