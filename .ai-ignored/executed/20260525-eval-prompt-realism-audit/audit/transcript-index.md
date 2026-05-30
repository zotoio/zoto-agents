# Transcript index — Eval Prompt Realism Audit
## Summary
- **Transcripts scanned:** 798 parent JSONL files under `~/.cursor/projects/home-andrewv-git-cursor-zoto-agents/agent-transcripts` (skipped all `subagents/` trees per AGENTS.md).
- **Total transcript directories:** 798
- **Scan wall time:** 14.39s (10-minute cap not reached)
- **Sampling cap:** 5 distinct hits per target; extras recorded in `truncated_beyond_cap` / per-target `truncated_at`.
- **Command + agent targets:** 31 (28 with ≥1 transcript hit, 3 zero-coverage with `readme` fallback).
- **Skill targets:** 14 — all marked `synthetic_seed: skill-usage` (skills load via upstream agents, not direct user invocation).
- **Hook targets:** 3 — all marked `synthetic_seed: readme` (hooks fire on lifecycle events).

## Hit counts (commands & agents)

| target_id | hits | seed_quality | truncated extras |
|-----------|------|--------------|------------------|
| `agent:zoto-eval-adviser` | 5 | — | — |
| `agent:zoto-eval-analyser-subagent` | 5 | — | 40 |
| `agent:zoto-eval-comparer` | 5 | — | 53 |
| `agent:zoto-eval-configurer` | 5 | — | 21 |
| `agent:zoto-eval-executor` | 4 | — | — |
| `agent:zoto-eval-generator` | 5 | — | 21 |
| `agent:zoto-eval-judge` | 5 | — | — |
| `agent:zoto-eval-updater` | 5 | — | 24 |
| `agent:zoto-plugin-manager` | 5 | — | 29 |
| `agent:zoto-spec-executor` | 5 | — | 3 |
| `agent:zoto-spec-generator` | 5 | — | 4 |
| `agent:zoto-spec-judge` | 5 | — | 9 |
| `command:sync-plugins` | 0 | readme | — |
| `command:z-eval-advise` | 5 | transcript | 6 |
| `command:z-eval-compare` | 5 | transcript | 11 |
| `command:z-eval-configure` | 5 | — | 17 |
| `command:z-eval-create` | 5 | — | 28 |
| `command:z-eval-execute` | 5 | transcript | 9 |
| `command:z-eval-help` | 5 | — | 7 |
| `command:z-eval-init` | 5 | transcript | 4 |
| `command:z-eval-judge` | 5 | — | 3 |
| `command:z-eval-jump` | 0 | readme | — |
| `command:z-eval-operator` | 0 | readme | — |
| `command:z-eval-start` | 5 | — | 2 |
| `command:z-eval-update` | 5 | — | 26 |
| `command:z-eval-workflow` | 5 | — | 2 |
| `command:z-spec-create` | 5 | transcript | — |
| `command:z-spec-execute` | 5 | transcript | — |
| `command:z-spec-init` | 1 | — | — |
| `command:z-spec-judge` | 5 | transcript | 1 |
| `command:zoto-create-plugin` | 1 | — | — |

## Zero-coverage command targets (readme fallback)

- `command:sync-plugins` — no real user invocation found in parent transcripts; Subtask 04 will synthesise from command README / frontmatter Usage.
- `command:z-eval-jump` — no real user invocation found in parent transcripts; Subtask 04 will synthesise from command README / frontmatter Usage.
- `command:z-eval-operator` — no real user invocation found in parent transcripts; Subtask 04 will synthesise from command README / frontmatter Usage.

## Sampling strategy notes

Scan all parent transcript JSONL files (skip subagents/) in mtime-descending order; prefer non-harness user prompts over eval-harness agent-* dirs; cap 5 hits per target; harness fallbacks only when no real user invocation exists.

Additional rules applied:
- Strip `<cursor_commands>…</cursor_commands>` blocks before storing `first_user_prompt`; keep natural-language tail from `<user_query>`.
- Capture up to two follow-up user turns verbatim in `follow_ups[]`.
- Normalise `/home/<user>/…` to `~/…` in prompt bodies; `source_path` uses `~` form only.
- **No redaction** in this artefact — Subtask 03 runs before eval rewrites.

## Coverage matrix

| target_id | transcript_hits | recommended_seed_source |
|-----------|-----------------|-------------------------|
| `agent:zoto-eval-adviser` | 5 | transcript |
| `agent:zoto-eval-analyser-subagent` | 5 | transcript |
| `agent:zoto-eval-comparer` | 5 | transcript |
| `agent:zoto-eval-configurer` | 5 | transcript |
| `agent:zoto-eval-executor` | 4 | transcript |
| `agent:zoto-eval-generator` | 5 | transcript |
| `agent:zoto-eval-judge` | 5 | transcript |
| `agent:zoto-eval-updater` | 5 | transcript |
| `agent:zoto-plugin-manager` | 5 | transcript |
| `agent:zoto-spec-executor` | 5 | transcript |
| `agent:zoto-spec-generator` | 5 | transcript |
| `agent:zoto-spec-judge` | 5 | transcript |
| `command:sync-plugins` | 0 | readme |
| `command:z-eval-advise` | 5 | transcript |
| `command:z-eval-compare` | 5 | transcript |
| `command:z-eval-configure` | 5 | transcript |
| `command:z-eval-create` | 5 | transcript |
| `command:z-eval-execute` | 5 | transcript |
| `command:z-eval-help` | 5 | transcript |
| `command:z-eval-init` | 5 | transcript |
| `command:z-eval-judge` | 5 | transcript |
| `command:z-eval-jump` | 0 | readme |
| `command:z-eval-operator` | 0 | readme |
| `command:z-eval-start` | 5 | transcript |
| `command:z-eval-update` | 5 | transcript |
| `command:z-eval-workflow` | 5 | transcript |
| `command:z-spec-create` | 5 | transcript |
| `command:z-spec-execute` | 5 | transcript |
| `command:z-spec-init` | 1 | transcript |
| `command:z-spec-judge` | 5 | transcript |
| `command:zoto-create-plugin` | 1 | transcript |
| `hook:cursor-workspace` | 0 | readme |
| `hook:zoto-eval-system` | 0 | readme |
| `hook:zoto-spec-system` | 0 | readme |
| `skill:zoto-advise-evals` | 0 | skill-usage |
| `skill:zoto-compare-evals` | 0 | skill-usage |
| `skill:zoto-configure-evals` | 0 | skill-usage |
| `skill:zoto-create-evals` | 0 | skill-usage |
| `skill:zoto-create-plugin` | 0 | skill-usage |
| `skill:zoto-create-spec` | 0 | skill-usage |
| `skill:zoto-cursor-top-monitor` | 0 | skill-usage |
| `skill:zoto-eval-tooling` | 0 | skill-usage |
| `skill:zoto-execute-evals` | 0 | skill-usage |
| `skill:zoto-execute-spec` | 0 | skill-usage |
| `skill:zoto-help-evals` | 0 | skill-usage |
| `skill:zoto-judge-evals` | 0 | skill-usage |
| `skill:zoto-judge-spec` | 0 | skill-usage |
| `skill:zoto-update-evals` | 0 | skill-usage |
