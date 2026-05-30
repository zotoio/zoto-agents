# Subtask: Tighten analyser system prompt (anti-regression)

## Metadata
- **Subtask ID**: 10
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 06
- **Created**: 20260525

## Objective

Strengthen `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` with explicit anti-patterns and worked before/after examples drawn from the audit, so the next `pnpm run eval:update --apply --with-analyser` (whenever it eventually runs against newly added or changed primitives) cannot undo the Phase 3 realism work. The `analyser_version` field MUST NOT change — that would invalidate every cached payload and trigger a full re-analysis pass that could overwrite the curated Phase 3 rewrites with fresh (and potentially regressive) model output.

Subtask 06 already rewrote the *prompts* and *expected_output* in `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` for realism; this subtask appends new analyser-vocab guard *assertions* to that same JSON so regressions surface at eval time.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains a new section titled **"Forbidden internal-mechanic vocabulary"** with a bulleted list of at least 8 anti-pattern phrases distilled from `audit/eval-case-audit.md` (e.g. `Available transcripts show zero askQuestion tool emissions`, `The spawned Task named X referenced the Y skill`, `Inside the generator flow the assistant invoked …`, `traces show zoto-update-evals proving drift-free regenerated content`).
- [x] `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains a new subsection titled **"Bare-command exception register"** that captures the rule from KD-2: bare command prompts only on precondition-abort paths or for documented `no-args` capabilities; otherwise prompts MUST include realistic flags / arguments.
- [x] `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains a new subsection titled **"Worked rewrite examples"** with at least 2 before/after pairs (one command, one agent) drawn directly from `audit/eval-case-audit.md`.
- [x] `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` `analyser_version` value is the SAME string it had before this subtask. Confirm via `git diff` that the frontmatter line is unchanged.
- [x] `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` gains at least 3 new assertions across its cases (distributed sensibly — e.g. one per case kind: command-style, agent-style, hook-style) that probe the new anti-patterns. Existing assertions and the per-case `prompt` / `expected_output` (rewritten by Subtask 06) are left intact.
- [x] `_meta.last_updated` refreshed on every rewritten case row in the analyser eval JSON; `_meta.generated_by` remains the existing stable string `"zoto-update-evals"` (per user decision 2026-05-25 — see spec KD-7).

## Definition of Done
- [x] The analyser markdown file contains all three new sections and the `analyser_version` line is byte-identical to its pre-spec value.
- [x] The analyser eval JSON gains ≥ 3 new guard assertions; total assertion count per case increases by ≥ 1 wherever an assertion was added.
- [x] No file outside `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` and `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` is touched.
- [x] The analyser markdown file still passes `node scripts/validate-template.mjs` (front-matter remains valid).
- [x] The eval JSON still passes the JSON-parse sweep.

## Implementation Notes

### Anti-pattern phrase list to seed

These are the observed worst offenders from the existing stamped output (extracted during exploration). Subtask 04's `audit/eval-case-audit.md` will surface more — extract the full list from there.

- `Available transcripts show zero askQuestion tool emissions from the generator`
- `The spawned Task named X referenced the Y skill`
- `Inside the generator flow the assistant invoked pnpm run …`
- `traces show zoto-update-evals proving drift-free regenerated content`
- `Repository diffs omit mutations for evaluator rows lacking _meta markers`
- `Touchpoints with zoto-configure-evals occur solely when …`
- `Across the trajectory the generator never emits askQuestion`
- `Reviewers observe no undocumented assistant tooling or edits …`

Replace each with the user-visible-outcome equivalent (e.g. "after the run, the generated `evals.json` row carries `_meta.generated: true`" instead of "Repository diffs omit mutations for evaluator rows lacking `_meta` markers").

### Worked rewrite examples — required format

For each before/after pair, present the *before* prompt + assertion, then the *after* prompt + assertion, then a one-sentence rationale citing the rubric axis it improves. Use the exact format shown below so the analyser model can pattern-match it:

```markdown
**Before** (internal-mechanic assertion):

> Assertion: "Inside the generator flow the assistant invoked `pnpm run eval:discover` via the documented explore-assisted route before authoring generated rows."

**After** (user-visible outcome):

> Assertion: "After the run, `manifest.yml` lists every approved skill/command/agent/hook id under `targets[].eval_files[]` and `pnpm run eval:list` prints each one."

**Why**: Internal command-trace assertions are unstable across implementations; the user only observes the resulting manifest entries and CLI listing.
```

### New analyser eval guard assertions — examples

These are the kinds of assertions Subtask 06 left room for. Add them across the existing cases in `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json`:

- `No emitted case prompt contains the phrase "Available transcripts show" (forbidden internal-mechanic vocabulary).`
- `No emitted command-kind case prompt is bare (i.e. matches /^/[a-z-]+\s*$/) unless the case scenario explicitly mentions a precondition-abort or documented no-args capability.`
- `Every emitted agent-kind case prompt does NOT start with "/" (per the analyser kind table, agents speak natural English).`

These guard assertions are themselves user-visible outcomes — they describe what the analyser's emitted JSON should look like, which is directly observable in the eval run logs.

### `analyser_version` invariance

Run `git diff plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` at the end of the subtask and confirm the frontmatter `analyser_version:` (or `analyser-version:` — preserve whatever spelling the file uses today) line does not appear in the diff. If it does, revert that single line before committing.

Note: exploration showed the analyser markdown does NOT currently carry an `analyser_version` field in its frontmatter — the version string lives in the `_meta.primitive_analysis.analyser_version` of stamped output (currently `2026.05.03-1`). If that observation holds, this subtask doesn't touch the version at all (there is nothing in the agent markdown to change). The invariance check still belongs in the status report: explicitly confirm "no `analyser_version` string introduced or changed in `zoto-eval-analyser-subagent.md`".

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `node scripts/validate-template.mjs` (scoped — the script validates the whole repo; if its runtime is short, run it; otherwise spot-check by parsing the modified markdown's YAML frontmatter manually).
- `python3 -c "import json; json.load(open('plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json'))"`.

Defer the eval validation trio to Subtask 11.

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
