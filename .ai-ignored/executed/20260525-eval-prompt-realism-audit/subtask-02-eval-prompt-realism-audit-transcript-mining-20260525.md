# Subtask: Transcript mining & target mapping

## Metadata
- **Subtask ID**: 02
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: None
- **Created**: 20260525

## Objective

Mine Cursor agent transcripts under `~/.cursor/projects/home-andrewv-git-cursor-zoto-agents/agent-transcripts/` (and any sibling project folders pointing at this repository) for real user prompts that invoked the in-scope commands and agents. Emit a per-target index of raw (unredacted) prompt seeds plus follow-up turns so Subtask 04 can use them as the basis for realistic rewrites after passing them through the Subtask 03 redactor.

## Deliverables Checklist
- [x] `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.json` keyed by `target_id` (e.g. `command:z-eval-create`, `agent:zoto-eval-generator`, `hook:zoto-eval-system`) → array of `{ transcript_uuid, first_user_prompt, follow_ups, source_path }`, with each `first_user_prompt` captured **verbatim** (redaction is performed downstream).
- [x] `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.md` — short prose summary: transcripts scanned, hits per target, list of zero-coverage targets, sampling strategy notes.
- [x] Coverage matrix at the bottom of `transcript-index.md`: rows = target ids, columns = `transcript_hits`, `recommended_seed_source` (one of `transcript` / `readme` / `skill-usage`).
- [x] Sampling cap recorded: at most 5 distinct transcript hits per target (the rewrite needs realism, not bulk). Hits beyond 5 are truncated and the truncation is noted per target.

## Definition of Done
- [x] `transcript-index.json` validates as JSON.
- [x] Every in-scope command and agent target has either ≥ 1 transcript hit or an explicit `synthetic_seed: readme|skill-usage` fallback in `transcript-index.md`.
- [x] No absolute paths from the operator's home directory appear in the JSON value bodies — only the structural `source_path` field may reference `~/.cursor/projects/...` (and even there, the leading `~` form is required; no `/home/<user>` literals).
- [x] No transcript-index file is written outside `specs/20260525-eval-prompt-realism-audit/audit/`.

## Implementation Notes

Transcript directory shape (empirically verified during exploration):
```
~/.cursor/projects/home-andrewv-git-cursor-zoto-agents/agent-transcripts/
  <uuid>/
    <uuid>.jsonl       ← turn-by-turn log
    subagents/          ← child subagent transcripts (do NOT cite these per the AGENTS.md rule)
```

Each JSONL line is a JSON object with at least `role`, `message.content[]`. The earliest `role: "user"` line typically contains the original command invocation either as:
- a `<cursor_commands>` XML block naming the command (e.g. `--- Cursor Command: zoto-spec-execute ---`), OR
- a leading `/<cmd-name>` token in the first text segment.

Target mapping rules:
- **Command target** (`command:<name>`): find `<cursor_commands>` block whose first `--- Cursor Command: <name> ---` line matches `<name>`, OR the first user message text starts with `/<name>` (with or without args).
- **Agent target** (`agent:<name>`): scan the same first user turn for an explicit `agent:<name>` reference, OR a `subagent_type: "<name>"` token, OR the user text explicitly directs work to that agent by name. Conservative: skip ambiguous matches.
- **Hook target** (`hook:<plugin>`): hooks fire from Cursor lifecycle events, not user prompts, so transcript mining will usually produce zero hits. Mark all hook targets as `synthetic_seed: readme|usage` fallbacks; do not attempt to invent transcript matches.
- **Skill target** (`skill:<name>`): skills are loaded by other agents, not invoked directly. Skip transcript mining for skills; mark them all as `synthetic_seed: skill-usage` (Subtask 04 will draw seeds from the SKILL.md `## Usage` or `### Examples` section).

Extraction rules:
- Capture the **first** `role: "user"` `text` segment as `first_user_prompt` (verbatim).
- Capture up to the next **two** `role: "user"` `text` segments as `follow_ups[]` (verbatim) — these power multi-turn cases.
- Strip `<cursor_commands>` blocks before saving (they are command documentation, not the user's actual prompt — keep only the user's appended natural-language tail).

Discovery scope:
- Primary: `~/.cursor/projects/home-andrewv-git-cursor-zoto-agents/agent-transcripts/<uuid>/<uuid>.jsonl`.
- Secondary (only if discovered during exploration): any other `~/.cursor/projects/<slug>/agent-transcripts/` directory whose recent JSONL entries reference paths under this repository. These are unlikely; if encountered, treat as informative only — record but do not let them dominate the sample set.

Time / recency budget: scan transcript directories in descending mtime order and stop once every in-scope target has either ≥ 1 hit or coverage from older transcripts has been exhausted. Skip transcript directories whose mtime is older than 180 days unless unfilled coverage gaps remain. Cap total scan walltime at 10 minutes; if the cap is hit, record per-target hit counts as-of-cap and continue to Subtask 04.

Sampling cap: at most 5 hits per target. If a target has more than 5 transcript hits, keep the 5 most recent (sorted by transcript directory mtime, descending) and record `truncated_at: 5` in the per-target block.

Redaction is **NOT** performed in this subtask — Subtask 04 calls the redactor from Subtask 03 when synthesising the rewrites. The raw extracts here are a working artefact; they MUST stay inside `specs/20260525-eval-prompt-realism-audit/audit/` and MUST NOT be committed to the central evals tree.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Validate locally with:
- `python3 -c "import json,sys; json.load(open('specs/20260525-eval-prompt-realism-audit/audit/transcript-index.json'))"` to confirm valid JSON.

No project-level test changes are required.

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-05-25
- Completed: 2026-05-25

### Work Log
- Scanned 798 parent transcript JSONL files under `~/.cursor/projects/home-andrewv-git-cursor-zoto-agents/agent-transcripts/` (806 dirs; 8 lacked JSONL). Skipped all `subagents/` trees.
- Indexed 48 targets (31 command/agent + 14 skill + 3 hook) from manifest plus `skill:zoto-cursor-top-monitor`.
- Prefer real user prompts over eval-harness `agent-*` fixture dirs; harness seeds used only when no parent transcript contained a non-harness invocation.
- Applied 5-hit cap with per-target `truncated_at` / `truncated_extra_count` where applicable.

### Blockers Encountered
_None._

### Files Modified
- `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.json` (created)
- `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.md` (created)
