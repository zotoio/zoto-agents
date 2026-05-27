# Subtask 10 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 10 |
| feature | Eval Prompt Realism Audit |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-25T13:23:04.000Z |
| last_heartbeat | 2026-05-25T13:31:17.000Z |
| completed_at | 2026-05-25T13:31:17.000Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains a new section titled **"Forbidden internal-mechanic vocabulary"** with a bulleted list of at least 8 anti-pattern phrases distilled from `audit/eval-case-audit.md` (e.g. `Available transcripts show zero askQuestion tool emissions`, `The spawned Task named X referenced the Y skill`, `Inside the generator flow the assistant invoked …`, `traces show zoto-update-evals proving drift-free regenerated content`). (`plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md (section "Forbidden internal-mechanic vocabulary", line 54)`)
- [x] **D02** — `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains a new subsection titled **"Bare-command exception register"** that captures the rule from KD-2: bare command prompts only on precondition-abort paths or for documented `no-args` capabilities; otherwise prompts MUST include realistic flags / arguments. (`plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md (section "Bare-command exception register", line 71)`)
- [x] **D03** — `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains a new subsection titled **"Worked rewrite examples"** with at least 2 before/after pairs (one command, one agent) drawn directly from `audit/eval-case-audit.md`. (`plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md (section "Worked rewrite examples", line 84)`)
- [x] **D04** — `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` `analyser_version` value is the SAME string it had before this subtask. Confirm via `git diff` that the frontmatter line is unchanged. (`plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md (no analyser_version field in frontmatter; none introduced or changed)`)
- [x] **D05** — `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` gains at least 3 new assertions across its cases (distributed sensibly — e.g. one per case kind: command-style, agent-style, hook-style) that probe the new anti-patterns. Existing assertions and the per-case `prompt` / `expected_output` (rewritten by Subtask 06) are left intact. (`plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json (cases 1/3/5 guard assertions appended; cases 2/4/6 unchanged)`)
- [x] **D06** — `_meta.last_updated` refreshed on every rewritten case row in the analyser eval JSON; `_meta.generated_by` remains the existing stable string `"zoto-update-evals"` (per user decision 2026-05-25 — see spec KD-7). (`plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json (last_updated=2026-05-25T13:31:17.000Z; all 6 cases generated_by=zoto-update-evals)`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` — Three anti-pattern guard assertions on cases 1/3/5; KD-7 generated_by on all cases; cache mirrored
- **modified** `.zoto/eval-system/cache/analyser/5906ead493d7b9e28c1f8775b3608e129cbf3b397ff595327150e50e526285fd.json` — Same three guard assertions appended to matching cache cases for eval:update parity
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Re-fixed after S12 cache restamp wiped prior guard assertions. D01-D03 pre-existing; D05/D06 restored. validate-template not re-run; JSON parse OK.
<!-- status:notes:end -->
