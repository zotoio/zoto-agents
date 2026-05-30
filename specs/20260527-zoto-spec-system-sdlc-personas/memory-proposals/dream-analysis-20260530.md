# Dream Extraction Analysis — Multi-Spec (5 specs + subsequent changes)

**Generated:** 2026-05-30
**Mode:** Dream extraction (Pattern B — work first, then escalate). NOT REM sleep.
**Workflow owner:** `crux-cursor-memory-manager`
**Config:** `.crux/crux-memories.json` — `enableMemories: true`, `enableMemoryCompression: true`, `maxCandidateFacts: 5` (per-spec), `maxUnrelatedChanges: 50`, `memoriesDir: memories`, `workDir: specs`.

> **No memory files were created and nothing was archived.** This artefact is a proposal for the parent agent to relay to the user for accept/skip + archive decisions.

---

## 0. Critical Corpus Finding — Empty Memory Store

- `memories/` is **empty** (zero `*.memory.md` / `*.memory.crux.md` files).
- `.crux/memory-index.yml` **does not exist**.
- `.crux/reference-tracking/` contains no trackers relevant to these candidates.

**Consequences for this dream:**
- **Every candidate below is NOVEL.** There are no near-duplicates or exact duplicates to filter.
- **No conflicts are possible** — conflict detection requires existing memories; there are none.
- **No resolved-bug detection is possible** — there are no existing `redflag` memories to cross-reference against the diffs.

This is the **first** memory population for the repo. Recommendation: accept a focused, high-signal core set rather than everything, so the corpus starts clean.

---

## 1. Per-Spec Completion / Verification Results

Note: this repo's Spec System uses `status/<subtask>.status.yml` + top-level `status.yml` (`aggregate_state`) for state, and `execution-report-*.md` for outcomes. The legacy `_execution-state.yml` named in config is not used here; verification was performed against the status files and execution reports.

| # | Spec (precedence) | Verified status | Evidence |
|---|---|---|---|
| 1 | `20260527-zoto-spec-system-sdlc-personas` (**highest**) | **NOT EXECUTED — DRAFT / planning only** | All **13** `status/*.status.yml` read `state: pending`; spec `## Status` = `Draft`; **no** persona agent files, **no** 5 phase skills, **no** `subtask-spec.schema.json` on disk; plugin still `0.7.0` (spec targets `1.0.0`). Commit `3817393` (2026-05-30) added only spec docs/status files — **zero code**. |
| 2 | `20260527-evals-json-first-migration` | **COMPLETED** | `status.yml` `aggregate_state: completed`; execution report Status=Completed; all 12 DoD confirmed; landed as code commit `5132944` (2026-05-30). |
| 3 | `20260526-eval-single-backend-colocated-restructure` | **COMPLETED** | Execution report Status=Completed; 10/10 subtasks verified; all gates green. |
| 4 | `20260526-eval-askquestion-strategy-bridge` | **COMPLETED (with exceptions)** | Execution report Status="Completed with exceptions"; 11/13 fully verified, subtasks 09 & 13 partial (declarative LLM smoke deferred — judge grading, not infra). |
| 5 | `20260525-eval-prompt-realism-audit` (**lowest**) | **COMPLETED (1 partial-accepted)** | Execution report final verdict PASS; 3 gates exit 0; subtask 04 accepted with documented bare-command register gap (KD-2). |

**Handling of the unexecuted spec (#1):** Per the extract skill, incomplete work items should not produce *outcome* memories. The sdlc-personas candidates below are therefore proposed at low priority and typed `idea` (design-intent), explicitly flagged as **unverified design decisions, not execution outcomes**. They capture reusable architectural patterns from the spec design, which remain valuable even though the spec has not been executed. The parent/user should weight them accordingly.

---

## 2. Diff / Scope Analysis (incl. "subsequent changes after that")

**Git timeline (most recent first):**
- `5132944` 2026-05-30 — `feat(eval-system): migrate non-skill evals from .test.ts to JSON-first` → **the actual execution of spec #2** (~163 files: engine, schemas, `evals/llm/_shared/*`, 38 `.test.ts`→`.json`, CI, manifest). This **is** the most-recent substantive change.
- `3817393` 2026-05-30 — `docs(specs): add sdlc-personas documentation and evals subtasks` → **spec #1 docs/status only, no code** (confirms #1 unexecuted).
- `688737b` 2026-05-30 — `chore: bump agent models to opus-4-8 / composer-2.5`.
- `1fa87d4` 2026-05-27 — eval prompt realism audit subtasks (spec #5 artefacts).
- Specs #3 and #4 work is folded into the eval-system history around 2026-05-26.

**"Subsequent changes after that" assessment:** There are **no post-HEAD working-tree code changes** — `git status` shows zero tracked modifications and zero untracked code outside `.ai-ignored/` and `specs/`. The only untracked content is spec-coordination artefacts under `.ai-ignored/` and `specs/`. Therefore the "subsequent work after the specs" the user referred to is precisely the **json-first migration execution (HEAD `5132944`)**, which is already spec #2 in scope. No additional out-of-band code learnings exist beyond the five specs.

**Threshold note:** Per-spec diffs are large (json-first alone ≈163 files), but these are each spec's *own* intended footprint, not unrelated concurrent noise, so the `maxUnrelatedChanges: 50` guard is informational only for a multi-spec retrospective dream. No abort warranted.

---

## 3. Artifact Examination Findings (what was read)

- **Execution reports** for specs #2–#5 (rich "Lessons Learned", "Outstanding Items", DoD, gate logs).
- **Spec docs** for #1 (Key Decisions D1–D11), #2 (KD-1..KD-10 + rollback strategy), #5 (KD-1..KD-9).
- **Status files**: sdlc-personas `status/*.status.yml` (all pending); json-first `status.yml` (completed).
- **On-disk reality checks**: `plugins/zoto-spec-system/agents/` (only the 3 original workflow agents), `plugins/zoto-spec-system/skills/` (only the 3 workflow skills), absence of `subtask-spec.schema.json`, plugin version `0.7.0`.
- **Git**: `git log`, per-commit `--stat`/`--name-only` for `3817393` and `5132944`.

**Strongest recurring signals across specs (recurrence boosts ranking):**
1. The `_meta.generated === true` / byte-preservation guard for user-authored eval content (specs #2, #3, #5).
2. `eval:update --apply --with-analyser` is network-dependent and can hang (~41 min); `--no-analyser` cached path is the offline/CI fallback (specs #2, #4, #5).
3. Editing a covered `SKILL.md` forces a follow-up `eval:update --apply` or `--check` flags critical drift (specs #2, #3, #5).
4. The three-gate eval validation (`eval:list` + `eval -- --collect-only` + `eval:update --check` all exit 0) (specs #4, #5).
5. Destructive migrations must fail safe (dry-run, single-commit revert, log extraction failures instead of silently writing corrupt JSON) (specs #2, #4).

---

## 4. Comparison Against Existing Memories

- Memories compared: **0** (empty corpus).
- Exact duplicates discarded: **0**.
- Near-duplicates flagged: **0**.
- Related-but-distinct: **0**.
- All candidates retained as **novel**.

## 5. Conflict Report

- **No conflicts.** Conflict detection is impossible against an empty corpus. (Internal de-duplication across the 5 specs was applied instead — see consolidations noted per candidate, with recency precedence given to the more recent spec.)

## 6. Resolved-Bug / Superseded Memory Detection

- **None possible.** No existing `redflag` memories exist to mark as resolved. (For awareness: within-scope, spec #2 supersedes spec #3's `defineLlmCodeEval`→`defineLlmEval` rename and the co-located `.test.ts` layout — but since neither is yet a memory, there is nothing to forget.)

---

## 7. Ranked Candidate Facts (global, recency-weighted)

Ranking order: type priority (core > redflag > goal > learning > idea), then recurrence across specs, measurability, actionability, novelty. Scope defaults to `base` (general-purpose learnings benefit all agents); agent-scoping noted only where clearly specific. `maxCandidateFacts` is 5 *per spec*; per the task this surfaces the strongest facts overall (12 candidates) with per-spec attribution.

---

### Candidate 1 — CORE
- **type:** `core`
- **title:** Destructive eval migrations are gated by the `_meta.generated === true` marker; cases/files without it are byte-preserved
- **description:** Any automated regeneration, migration, or rewrite of eval files MUST treat `_meta.generated === true` (case marker) and `// _meta.generated: true` / `# _meta.generated: True` (file marker, line 1, with a 20-line backward-compat scan) as the hard gate. Cases lacking `_meta` or with `generated !== true` are user-authored and must be byte-preserved; rewrite subtasks should diff preserved rows post-write to prove zero byte changes. This gate protected 100% of user-authored content across three destructive eval migrations.
- **tags:** `[eval-system, migration, user-content, _meta, safety]`
- **scope:** `base`
- **rationale:** Recurs across specs #2, #3 (lesson: "the `_meta.generated === true` gate proved robust — zero user-authored content at risk"), and #5 (KD-8 byte-preserve). Highest recurrence + a fundamental invariant ("MUST"). Recency precedence: phrasing follows the most recent spec (#2).
- **source:** `20260527-evals-json-first-migration` (+ `20260526-eval-single-backend-colocated-restructure`, `20260525-eval-prompt-realism-audit`)

### Candidate 2 — CORE
- **type:** `core`
- **title:** Unify on one declarative format with a typed `runner` escape hatch instead of maintaining parallel imperative/declarative tracks
- **description:** When a system has drifted into dual code+declarative tracks, collapse to a single canonical declarative (JSON) format and add a typed discriminator field (`runner`) that delegates the rare imperative cases to a TS file via a typed contract (`RunnerParams`). A custom Vite plugin (`resolveId` + `load`) loads the JSON suites in-memory as Vitest tests — no `.tmp.ts` shim files on disk — preserving test-explorer/reporters/parallelism. This removed an entire parallel track while keeping the imperative escape hatch.
- **tags:** `[eval-system, architecture, vitest, json, escape-hatch, runner]`
- **scope:** `base`
- **rationale:** Headline architectural pattern of the most recent completed spec (#2, highest non-draft precedence). Durable, reusable "single canonical format + typed escape hatch" design principle. Supersedes spec #3's earlier co-located `.test.ts` approach (recency precedence applied).
- **source:** `20260527-evals-json-first-migration`

### Candidate 3 — CORE
- **type:** `core`
- **title:** Eval cases must assert user-visible outcomes with realistic, transcript-seeded prompts — never internal mechanics
- **description:** Generated eval prompts should read like real Cursor user messages (seeded from redacted agent transcripts, falling back to README/SKILL `## Usage`), using realistic invocation shapes per kind (`/cmd <real args>` for commands, natural-English delegation for agents, lifecycle-event descriptions for hooks). Assertions must check user-visible outcomes (artefacts, exit codes, on-screen guidance, manifest rows) — NOT internal mechanics ("the spawned Task referenced skill X", "assistant invoked pnpm run …"). Internal-mechanic assertions are allowed ONLY when they encode a hard contract (e.g. `_meta.generated`, exact refuse strings, schema invariants, append-only history), cited in an exception register.
- **tags:** `[eval-system, prompt-quality, realism, assertions, testing]`
- **scope:** `base`
- **rationale:** The entire thesis of spec #5; a durable quality principle for any eval authoring. Highly actionable with a concrete allow-list discipline.
- **source:** `20260525-eval-prompt-realism-audit`

### Candidate 4 — REDFLAG
- **type:** `redflag`
- **title:** `explore` subagents cannot write files — use `generalPurpose` for investigation deliverables that need file output
- **description:** Read-only `explore` subagents silently fail to persist audit/investigation artefacts. Any subtask whose deliverable is a written file (audit reports, classification matrices, ADRs) MUST be assigned to `generalPurpose` (or another write-capable agent), not `explore`. Observed when explore subtasks "completed" but produced no files.
- **tags:** `[orchestration, subagents, explore, generalPurpose, spec-system]`
- **scope:** `base`
- **rationale:** Concrete, recurring orchestration pitfall (spec #4 lesson; spec #5 subtask 01 used `explore` for inventory and the realism spec correctly routed write-deliverables to `generalPurpose`). Prevents wasted subtask runs. Strongly actionable.
- **source:** `20260526-eval-askquestion-strategy-bridge`

### Candidate 5 — REDFLAG
- **type:** `redflag`
- **title:** `eval:update --apply --with-analyser` is network-dependent and can hang (~41 min); use `--no-analyser` cached path for CI/offline
- **description:** The analyser apply path requires reachability to the @cursor/sdk API-key exchange endpoint and has hung at ~41 minutes in practice. For offline/CI/deterministic runs, use `pnpm run eval:update --apply --no-analyser` which regenerates from cached analyser payloads. Reserve `--with-analyser` for online runs when primitives genuinely changed and a cache refresh is needed.
- **tags:** `[eval-system, analyser, ci, network, fallback]`
- **scope:** `base`
- **rationale:** Recurs across specs #2 (outstanding #3), #4 (lesson — apply hung at ~41min), and #5 (no `--with-analyser` needed once manifest persisted). High recurrence + saves real time.
- **source:** `20260526-eval-askquestion-strategy-bridge` (+ #2, #5)

### Candidate 6 — REDFLAG
- **type:** `redflag`
- **title:** Editing a covered `SKILL.md` requires a follow-up `eval:update --apply` or `eval:update --check` reports critical drift
- **description:** Modifying any `SKILL.md` (or other covered primitive surface) changes its content hash, so `eval:update --check` will exit 2 with critical drift until you run `eval:update --apply` (`--no-analyser` for cached). This is expected and is part of the editing subtask's Definition of Done — not an unrelated CI failure. Always re-stamp after editing covered primitives.
- **tags:** `[eval-system, drift, manifest, skill, definition-of-done]`
- **scope:** `base`
- **rationale:** Recurs across specs #2 (lesson + DOD06 drift), #3 (pre-existing SKILL.md drifts), #5 (drift remediation table). A repeatedly-rediscovered gotcha → strong memory.
- **source:** `20260527-evals-json-first-migration` (+ #3, #5)

### Candidate 7 — REDFLAG
- **type:** `redflag`
- **title:** Don't bump `analyser_version` for prompt-only strengthening — it invalidates all cached payloads and can overwrite curated rewrites
- **description:** Strengthening the analyser system prompt (adding forbidden-vocabulary lists, worked examples) MUST NOT bump `analyser_version`. Bumping invalidates every cached analyser payload and forces the next `eval:update --apply` to re-analyse, which can overwrite hand-curated case rewrites with fresh model output. The strengthened prompt guards future analyses of *new/changed* primitives while curated current-state rewrites stay canonical.
- **tags:** `[eval-system, analyser, versioning, cache, prompt-engineering]`
- **scope:** `base`
- **rationale:** Non-obvious, high-impact pitfall from spec #5 (KD-6). Protects curated work from being silently regenerated.
- **source:** `20260525-eval-prompt-realism-audit`

### Candidate 8 — REDFLAG
- **type:** `redflag`
- **title:** On spec resume, reconcile filesystem reality against status files before acting — status often lags the disk
- **description:** When resuming an interrupted spec execution, the status files can read `pending`/incomplete while the actual artefacts already exist on disk (and vice versa). Reconcile on-disk reality with status files *first*, then proceed. Observed directly in this very dream: the sdlc-personas spec shows all 13 statuses `pending` — but here disk reality confirms it genuinely is unexecuted, the opposite lag direction from spec #2's resume.
- **tags:** `[spec-system, resume, status, reconciliation, execution]`
- **scope:** `base`
- **rationale:** Spec #2 lesson ("filesystem reality and status files must be reconciled first") corroborated live during this dream. Strong anti-stale-state guardrail.
- **source:** `20260527-evals-json-first-migration`

### Candidate 9 — LEARNING
- **type:** `learning`
- **title:** Three-gate eval validation: `eval:list` + `eval -- --collect-only` + `eval:update --check` must all exit 0
- **description:** The canonical post-change eval validation is three gates that must each exit 0: (1) `pnpm run eval:list` proves the manifest still enumerates every target; (2) `pnpm run eval -- --collect-only` proves every backend can collect the cases; (3) `pnpm run eval:update --check` proves no source-hash/content drift. Capture exit logs in the execution report.
- **tags:** `[eval-system, validation, gates, ci, manifest]`
- **scope:** `base`
- **rationale:** Shared canonical gate set across specs #4 and #5. Concrete, repeatable, measurable acceptance procedure.
- **source:** `20260525-eval-prompt-realism-audit` (+ #4)

### Candidate 10 — LEARNING
- **type:** `learning`
- **title:** Make destructive migrations fail-safe: dry-run, single-commit checkpoint, and log AST-extraction failures to an audit instead of writing corrupt output
- **description:** For one-shot destructive migrations: (1) provide a `--keep-ts`-style dry-run that writes new artefacts without deleting originals so you can validate first; (2) land the whole migration in a single commit so `git revert` cleanly restores prior state; (3) make the migration idempotent (re-run = no-op); (4) when parsing/AST extraction fails on a file, leave it un-migrated with a deprecation warning and record it in a migration audit — NEVER silently emit corrupt output. Partial migration is known to corrupt declarative JSON (`},]`); validate with `eval:list` after each batch.
- **tags:** `[migration, safety, idempotency, git, audit, ast]`
- **scope:** `base`
- **rationale:** Consolidates spec #2's rollback strategy + idempotency lesson with spec #4's "partial migration corrupts JSON; validate with eval:list after each batch". Strong, reusable migration discipline.
- **source:** `20260527-evals-json-first-migration` (+ #4)

### Candidate 11 — LEARNING
- **type:** `learning`
- **title:** Use per-package `pnpm -r test` as the reliable signal; a single parallel Vitest invocation can flake on CLI integration timeouts
- **description:** The canonical green-test signal is per-package `pnpm -r test` (e.g. cursor-top 86/86, eval-system 128/128, spec-system 132/132). A single combined parallel Vitest invocation can flake specifically on spec-system CLI integration timeouts — don't treat that flake as a regression; fall back to the per-package path. Also: a static `evals/vitest.config.ts` must exclude `llm/**` to avoid `#eval-engine` import failures during `--collect-only`.
- **tags:** `[testing, vitest, pnpm, flake, ci, monorepo]`
- **scope:** `base`
- **rationale:** Spec #2 lesson (per-package reliable; parallel flakes) + spec #4 lesson (vitest config must exclude `llm/**`). Saves time chasing false regressions.
- **source:** `20260527-evals-json-first-migration` (+ #4)

### Candidate 12 — IDEA (design-intent from UNEXECUTED spec #1)
- **type:** `idea`
- **title:** Thin persona agents + thick shared phase skills, dispatched via an existing role-key extension point with a schema-anchored required-frontmatter contract
- **description:** Design pattern for adding domain-specialist subagents to an orchestration plugin (from the *unexecuted* sdlc-personas spec, so unverified): keep persona agent files small (~30–80 lines, hard cap ≤200) holding only role identity + "stay in lane" guardrails + a pointer to a shared phase skill; put all checklists/templates/workflows in a few shared phase skills (5 SDLC phases, NOT one skill per persona). Dispatch by reusing the existing `spec-spawn-prefix --role <key>` mechanism (so config `tokenBudget`/`model` flow through unchanged) instead of building a parallel mechanism. Anchor the contract in a single JSON Schema (`subtask-spec.schema.json`) consumed by executor + judge + scaffold parsers as the single source of truth, with the new required `persona:` frontmatter enforced as a fail-loud breaking change (no migration script; error names the offending file).
- **tags:** `[spec-system, agents, skills, architecture, design-intent, schema, unexecuted]`
- **scope:** `base` (could later scope to `agents/zoto-spec-executor` / `agents/zoto-spec-generator` once executed)
- **rationale:** Highest-precedence spec by date, but **NOT executed** — typed `idea` and clearly flagged as unverified design intent. Captures a genuinely reusable "thin agent / thick skill + reuse the existing extension point + schema as single source of truth" architecture worth retaining even before execution.
- **conflicts:** none
- **source:** `20260527-zoto-spec-system-sdlc-personas`

---

## 8. Candidates Considered but Excluded (de-duplicated / too spec-specific)

- "Single-owner provenance: re-spawn the originally-assigned subagent to fix verification fix-lists, then re-verify" — strong but folded conceptually into orchestration discipline; can be elevated to its own `learning` if the user wants spec-executor-scoped memories.
- "Synthetic askquestion-bridge fallback for SDK 1.0.12" — too tied to a specific SDK version; likely to age out.
- "Preserve `_meta.source_hash` verbatim during in-place rewrites to keep `--check` at exit 0" — subsumed by Candidate 6 + Candidate 9.
- "Running 4 parallel Phase-1 subtasks works; main friction is cross-file import deps" — useful but lower signal than the selected set.
- "Redaction pass (home paths→`~`, strip tokens/keys) via a shared Node helper before transcript text enters evals" — could be added as a `learning` if transcript-mining recurs.

---

## 9. Proposed Actions for Parent/User

1. **Accept/skip** each of the 12 ranked candidates (recommend accepting Candidates 1–11; treat Candidate 12 as optional given the source spec is unexecuted).
2. **Scope confirmation** — all proposed as `base`. Confirm whether any (esp. 4, 8, 12) should instead be agent-scoped (`memories/agents/zoto-spec-executor/…`).
3. **Archive decision** — do NOT archive any of the 5 specs; spec #1 (sdlc-personas) is still pending execution. Specs #2–#5 are complete but archival is the user's call (recommend keeping in `specs/` until sdlc-personas is also done, to keep the eval-system narrative co-located).
4. On accept, I will delegate to `crux-skill-memory-crud` to create files, then rebuild `.crux/memory-index.yml` via `crux-skill-memory-index`.

**No memory files created. No archival performed. No `AskQuestion` issued.**
