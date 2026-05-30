# Subtask: Token-Budget Audit & Design Memo

## Metadata
- **Subtask ID**: 01
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: None
- **Created**: 20260506

## Objective

Confirm via `rg` that no token-budget keys exist in `plugins/zoto-spec-system/` today and produce a **short** design memo (≤ 50 lines) that locks the config-key contract, the resolution algorithm, the live-reloadable vs fresh-invocation key partition, and the spawn-role mapping. This subtask writes **no code** — its output is a single concise memo that subtasks 02, 03, and 04 will consume. The memo is intentionally short: the audit conclusion is "zero matches"; the contract itself is the deliverable.

## Deliverables Checklist
- [x] `specs/20260506-spec-system-live-status/design-token-budget-and-no-restart.md` — short design memo (≤ 50 lines, prefer compact tables over prose) with these sections:
  - **Current state** — one-line grep evidence: `rg "tokenBudget|maxTokens|token_budget|max_tokens|context_window" plugins/zoto-spec-system → 0 matches`. One-sentence note that token budget today is implicit (the model's intrinsic context window declared via `model:` frontmatter on each agent file).
  - **Config-key contract (locked)** — the exact JSON shape downstream subtasks must implement:
    - `subagents.default.tokenBudget: integer` (default `200000`, min `1000`, max `2000000`)
    - `subagents.<role>.tokenBudget: integer` per role `generator | executor | judge | subtask` (each optional; falls back to `subagents.default.tokenBudget` when absent)
    - `subagents.default.model: string` (optional override, falls back to the agent's frontmatter `model:`)
    - `subagents.<role>.model: string` (optional per-role override)
    - `aggregator.pollIntervalMs: integer` (default `1500`, min `250`, max `60000`)
    - `aggregator.debounceMs: integer` (default `250`, min `50`, max `5000`)
    - `aggregator.enabled: boolean` (default `true`)
  - **Resolution algorithm** — pseudocode: `subagents.<role>.tokenBudget ?? subagents.default.tokenBudget ?? 200000`. Same pattern for `model`.
  - **Spawn-role mapping** — explicit map from spawned subagent name to config role:
    - `zoto-spec-generator` → `generator`
    - `zoto-spec-judge` → `judge`
    - any other spawned subagent (`crux-platform-architect`, `crux-software-engineer`, `generalPurpose`, `explore`, `shell`, etc.) → `subtask`
    - The `executor` role is **never spawned by the executor** — it represents the executor itself when external tooling (e.g. a wrapper script) needs to resolve the executor's own budget; the executor LLM does not consume it. Document this caveat in the memo so subtask 04 doesn't add a wrong code path.
  - **No-restart contract** — live-reloadable: `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, `spec.parallelLimit`. Fresh-invocation-required: `unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*`. One-line reasoning per category (live-reloadable = consumed at top of every aggregator iteration; fresh-invocation = consumed during executor startup, e.g. directory layout).
  - **How the executor passes the budget** — Cursor's `Task` API has no `maxTokens` parameter. The executor LLM shells out to `tsx scripts/spec-spawn-prefix.ts --role <role> --status-yml <path> --status-md <path>`, which prints the verbatim prompt prefix (`Token budget: <N>. ...`). The executor injects the printed prefix into the next `Task` call's `prompt`. Subtask 04 ships this CLI.
  - **Migration strategy** — sparse / missing `subagents` block ⇒ defaults apply silently; no breaking change. Existing specs without `status/` directories continue to execute under the legacy spawn path (subtask 04 documents the branch).

## Definition of Done
- [x] Design memo committed at `specs/20260506-spec-system-live-status/design-token-budget-and-no-restart.md`
- [x] Memo grep-confirms the absence of token-budget keys today (path + match excerpts)
- [x] Memo locks the config-key contract — every key, default, min/max, and live-reload classification is specified
- [x] Memo specifies the resolution algorithm and the no-restart vs fresh-invocation split
- [x] No linter errors in the memo (markdown lint clean)

## Implementation Notes

- Use `rg` / Grep to confirm the current state — search for `tokenBudget`, `maxTokens`, `token_budget`, `max_tokens`, `budget`, `context_window` across `plugins/zoto-spec-system/`. Expected result: no matches inside the plugin, confirming the contract is implicit-only today.
- Reference the eval-system's `analyser.concurrency` block as the style anchor — same draft-07 schema, same `additionalProperties: false`, same descriptive doc strings.
- The memo is the **input contract** for subtasks 02 (schemas), 03 (loader), 04 (wiring), and 06 (subagent prompt). Be precise: ambiguity here cascades.
- This subtask creates **only the memo file**. Do not edit any code, schema, agent, skill, command, or rule.
- Keep the memo to ≤ 50 lines. The audit conclusion is one line; the contract is a small set of tables; do not pad with prose. Subtask 09 owns the full end-user docs.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- The deliverable is a markdown file; verification is read-only.
- A markdown lint check (`pnpm dlx markdownlint-cli2 specs/20260506-spec-system-live-status/design-token-budget-and-no-restart.md` or equivalent) is sufficient.
- Defer full test-suite execution to subtask 08.

## Execution Notes

### Agent Session Info
- Agent: zoto-plugin-manager (substituted for crux-software-engineer)
- Started: 2026-05-06T06:10:00Z
- Completed: 2026-05-06T06:27:20Z

### Work Log
- Read subtask + parent spec (locked decisions BU/TB/L).
- Workspace search: pattern `tokenBudget|maxTokens|token_budget|max_tokens|context_window` under `plugins/zoto-spec-system` → **No matches found** (Grep tool).
- Drafted `design-token-budget-and-no-restart.md` (≤50 lines, tables-first); iterated markdownlint (MD013/MD022/MD031/MD058) until clean.
- Consolidated spawn/`executor` caveat into resolution fenced comment + spawn table to satisfy line budget without dropping locked semantics.

### Blockers Encountered
- None.

### Files Modified
- `specs/20260506-spec-system-live-status/design-token-budget-and-no-restart.md` (created)
- `specs/20260506-spec-system-live-status/subtask-01-spec-system-live-status-token-budget-audit-20260506.md` (checklists + execution notes)

### Adversarial Verification (zoto-spec-judge)

- **Verdict: Verified** (all Deliverables Checklist + Definition of Done items independently confirmed).
- Memo exists at the required path; line count = 50 (within ≤ 50 budget).
- All seven required sections present and aligned with spec Key Decisions BU/TB:
  - Current state with one-line `rg` evidence (0 matches at audit time).
  - Config-key contract — every key, default, and bound from the subtask spec is captured (table-form), including the bonus `spec.parallelLimit` row.
  - Resolution algorithm — pseudocode `TB(r)=subagents[r].tokenBudget??subagents.default.tokenBudget??200000` and equivalent `M(r)` line.
  - Spawn-role mapping — `zoto-spec-generator`→`generator`, `zoto-spec-judge`→`judge`, others→`subtask`; executor-role meta-only caveat captured inline in the resolution comment.
  - No-restart contract — live-reload (`subagents.*.{tokenBudget,model}`, `aggregator.*`, `spec.parallelLimit`) vs fresh-invoke (`unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*`) partition matches Key Decision BU exactly.
  - How the executor passes the budget — `Task` omits `maxTokens`; `tsx scripts/spec-spawn-prefix.ts` (subtask 04) prints the prefix; executor injects it into the spawn `prompt`.
  - Migration strategy — sparse `subagents` ⇒ silent defaults; missing `status/` ⇒ legacy spawn (deferred to 04).
- Re-ran `rg "tokenBudget|maxTokens|token_budget|max_tokens|context_window" plugins/zoto-spec-system` — current matches all live in subtask 02's just-landed schemas/docs/templates (`config.schema.json`, `subtask-status.schema.json`, `status-schema.md`, `subtask-status.{md,yml}.tmpl`). These are legitimate Phase-1 sibling output, not a regression of subtask 01's audit conclusion.
- All checklist boxes (Deliverables + DoD) confirmed by direct file inspection; none unticked.
