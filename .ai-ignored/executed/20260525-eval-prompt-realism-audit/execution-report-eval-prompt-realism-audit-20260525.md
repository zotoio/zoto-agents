# Execution Report — Eval Prompt Realism Audit (20260525)

Subtask 11 validation run completed **2026-05-25T13:24Z** at repo `e49961ff5330e60d9adf4aa48727cf8247371d5e`. **Post–Subtask 11 closing re-run** (after S10/S12 remediation) **2026-05-25T13:35Z** on the same `git_ref`.

## Gate exit summary (FINAL — authoritative)

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| 1 | `pnpm run eval:list` | **0** | 47 eval JSON files; `total`: 299 cases (2026-05-25T13:35Z re-run) |
| 2 | `pnpm run eval -- --collect-only` | **0** | Static vitest smoke 1/1; run `20260525T133530Z` (2026-05-25T13:35Z re-run) |
| 3 | `pnpm run eval:update --check` | **0** | `{"status":"clean","checked":52,"critical_count":0,"parity_drift":null}` |

**Closing apply skipped:** `eval:update --check` exits **0**, so `pnpm run eval:update --apply --no-analyser` was **not** re-invoked (per Implementation Notes). Manifest already reflects post-fix end-state (`updated_at`: **2026-05-25T13:34:51.754Z**; `git_ref`: `e49961ff5330e60d9adf4aa48727cf8247371d5e`).

### Historical gate table (initial S11 session)

| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| 3 (initial) | `pnpm run eval:update --check` | 2 | Critical drift: 1 modified + 5 added targets |
| 3b (remediate) | `pnpm run eval:update --apply --no-analyser` | 0 | Regenerated 4 cached declarative targets |
| 4 (closing apply) | `pnpm run eval:update --apply --no-analyser` | 0 | Idempotent refresh; manifest stamped |
| 5 (post-apply verify) | `pnpm run eval:update --check` | 0 | Clean at execution time (transient persist gap noted by judge) |

## Post-fix notes (S10 / S12 remediation)

After the initial S11 judge **failed** (manifest not persisted; `--check` drift on disk), follow-up work closed blockers without bumping `analyser_version`:

- **Subtask 10 (analyser prompt):** Judge re-verified **verified** — anti-pattern guard assertions on cases 1/3/5; `generated_by` / `last_updated` stamps; cache mirror for guard assertions; `validate-template` exit 0.
- **Subtask 12 (cache + restamp):** Judge **pass** — prompt-first dedup holds; generator S06 reframe aligned (cache `fb6c6130…` ↔ central JSON ↔ LLM test); `eval:update --check` clean; 43/43 LLM first-line guards; manifest refreshed to **2026-05-25T13:34:51.754Z** with append-only history (0 deletions in `git diff`).

This S11 **re-run** confirms the trio gates **1 / 2 / 3** all exit **0** against persisted manifest state.

## Drift remediation (initial session)

Initial `--check` reported six critical deltas:

| target_id | kind | reason |
|-----------|------|--------|
| `skill:zoto-create-evals` | modified | public-surface change on covered target |
| `skill:zoto-cursor-top-monitor` | added | added skill with no eval coverage |
| `command:zoto-cursor-top` | added | added command with no eval coverage |
| `agent:zoto-cursor-top-troubleshooter` | added | added agent with no eval coverage |
| `agent:zoto-eval-architect` | added | added agent with no eval coverage |
| `agent:zoto-eval-engineer` | added | added agent with no eval coverage |

Remediation `--apply --no-analyser` regenerated four cached targets and recorded five newly discovered primitives. Five targets skipped with `no_cached_analyser_payload`; **no `--with-analyser` fallback** was required once manifest persisted.

## Fallback applied?

**No.** `--with-analyser` targeted apply was not needed; final authoritative `--check` exits **0**.

## Manifest diff summary

| File | Change |
|------|--------|
| `.zoto/eval-system/manifest.yml` | `updated_at` → **2026-05-25T13:34:51.754Z**; `git_ref` → `e49961ff…`; **52 targets** checked; content hashes aligned with regenerated eval cases |
| `.zoto/eval-system/manifest.history.yml` | **Append-only**: latest snapshot `updated_at` **2026-05-25T13:34:51.754Z**; `git diff` deletion count **0** |

`analyser_version` was **not** bumped (KD-6 preserved).

## Per-suite summary (Phase 3 + 4)

Status references: `specs/20260525-eval-prompt-realism-audit/status/`.

| Subtask | Status file | Rewritten | Preserved / proof |
|---------|-------------|-----------|-------------------|
| 05 — eval-system commands | `subtask-05-…status.yml` | 74 generated / 13 files | 0 user-authored; payload parity 0 mismatches |
| 06 — eval-system agents | `subtask-06-…status.yml` | 47 generated / 8 files | 0 user-authored; analyser assertions deferred to ST-10 |
| 07 — hooks + skills | `subtask-07-…status.yml` | 60 generated | 23 user rows **byte-preserved** (0 violations) |
| 08 — spec-system suite | `subtask-08-…status.yml` | 63 generated | 12 user **semantic/byte** preserved; judge verified |
| 09 — workspace + cursor-top | `subtask-09-…status.yml` | 14 generated (4 `.cursor/evals`) | 3 user byte-preserved; cursor-top monitor **bytes_preserved: true** |
| 10 — analyser prompt | `subtask-10-…status.yml` | Meta + 3 new guard assertions | Existing rewritten prompts from ST-06 intact; post-fix judge **verified** |
| 12 — cache + restamp | `subtask-12-…status.yml` | 143 cache case bodies / 21 cache files | 32 LLM test files restamped; manifest persist confirmed |

## Subtask 04 — partial acceptance (bare-command register gap)

**Accepted with documented gap (KD-2):** `audit/realism-rubric.md` lists **19** bare-command exception rows, while `eval-rewrites.json` still classifies a larger set of bare `rewrite_prompt` values. ST-04 judge remains **partial** — either expand the register for every retained bare prompt (with code refs) or rewrite remaining bare prompts to non-bare forms. S11 validation does **not** block on this register completeness; exceptions retained in the execution report below reflect the **19 documented rows** only.

## Bare-command exceptions retained

From `audit/realism-rubric.md` (KD-2 register): 19 cases across `zoto-create-plugin`, `z-eval-*` (create, execute, help, init, judge, jump, operator, start, update, workflow), and `z-spec-create` / `z-spec-execute` / `z-spec-judge` — each with documented **precondition-abort** or **documented-no-args** exemption and code ref.

## Contract-assertion exceptions retained

From `audit/realism-rubric.md` (KD-3 list): `_meta.generated` guards (JSON/TS/pytest), exact precondition refuse strings, `source_hash` SHA-256, analyser envelope invariants, **`manifest.history.yml` append-only**, `fixture_justifications[]` cardinality, comparer `/canvas` template equality, `needs_user_input` schema, hook stdout JSON contract.

## Command transcripts (abbreviated)

<details>
<summary>FINAL re-run — gates 1–3 (2026-05-25T13:35Z)</summary>

```
pnpm run eval:list → exit=0, total=299
pnpm run eval -- --collect-only → vitest 1/1, exit=0, run_id=20260525T133530Z
pnpm run eval:update --check → status=clean, checked=52, exit=0
(closing apply skipped — check already 0; manifest updated_at=2026-05-25T13:34:51.754Z)
```
</details>

## Final verdict

**PASS** — All three validation gates exit **0** on the post-fix authoritative re-run; manifest persisted at **2026-05-25T13:34:51.754Z**; history append-only invariant holds; `analyser_version` unchanged. ST-04 bare-command register completeness remains a **partial** follow-up, not a gate blocker.
