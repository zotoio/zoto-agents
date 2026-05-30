# Subtask: Realism rubric, per-case audit & rewrites payload

## Metadata
- **Subtask ID**: 04
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 01, 02, 03
- **Created**: 20260525

## Objective

Synthesise the inventory (Subtask 01), transcript index (Subtask 02), and redaction helper (Subtask 03) into the audit's canonical artefacts: a realism rubric, a per-case classification report, and a machine-readable `eval-rewrites.json` payload that the Phase 3 rewrite subtasks consume verbatim. After this subtask completes, every Phase 3 subtask should be able to operate mechanically — no further classification judgement required.

## Deliverables Checklist
- [ ] `specs/20260525-eval-prompt-realism-audit/audit/realism-rubric.md` — full rubric document.
- [ ] `specs/20260525-eval-prompt-realism-audit/audit/eval-case-audit.md` — per-file table with one row per case (case id, current realism class, current invocation shape, current assertion realism, proposed action, citation source).
- [ ] `specs/20260525-eval-prompt-realism-audit/audit/eval-rewrites.json` — machine-readable rewrite payload keyed by file path → `{ target_id, container_shape, cases: { <case_id>: { rewrite_prompt: string | null, rewrite_follow_ups: string[] | null, rewrite_assertions: string[] | null, rewrite_expected_output: string | null, preserve: boolean, seed_source: "transcript:<uuid>" | "readme:<path>" | "skill-usage:<path>", justification: string } } }`.
- [ ] Bare-command exception register section inside `realism-rubric.md` listing every case that retains a bare `/cmd` prompt with the cited precondition or capability.
- [ ] Contract-assertion exception list inside `realism-rubric.md` enumerating every internal-mechanic assertion family that is allowed to remain (with the contract each one encodes).

## Definition of Done
- [ ] `realism-rubric.md` documents the four scoring axes (prompt-realism, invocation-shape, assertion-realism, coverage) and the bare-command + contract-assertion exception registers from the spec's KD-2 and KD-3.
- [ ] `eval-case-audit.md` has one row per generated case in the inventory; user-authored cases are listed with `preserve: true` and no rewrite proposal.
- [ ] `eval-rewrites.json` validates as JSON; every key matches a path in `audit/eval-inventory.json`; every case id matches an id present in the source file; every `rewrite_assertions[]` entry is either a user-visible-outcome statement OR a string that quotes the contract-assertion exception list verbatim.
- [ ] Every command and agent case rewrite that proposes a non-bare prompt cites either `seed_source: "transcript:<uuid>"` (with the uuid present in `transcript-index.json`) or `seed_source: "readme:<repo-relative-path>"` / `seed_source: "skill-usage:<repo-relative-path>"` for synthetic seeds.
- [ ] Every proposed prompt passes through the Subtask 03 `redact` helper before being stored in `eval-rewrites.json` (a one-liner sanity assertion in the audit report records the call site).
- [ ] No files outside `specs/20260525-eval-prompt-realism-audit/audit/` are modified.

## Implementation Notes

### Rubric scoring axes

1. **Prompt-realism** — would a real Cursor user paste this verbatim? Allowed: `realistic` / `mixed` / `synthetic`.
2. **Invocation-shape** — does the prompt obey the analyser contract's per-kind shape table?
   - command: `/<cmd> [args]`, bare only on the precondition-abort path or documented "no args" capability.
   - agent: natural-English delegation (no leading `/`), ideally mirroring how the parent command would hand off.
   - hook: a description of the Cursor lifecycle event (e.g. `Cursor fires sessionStart in this workspace after …`).
   - skill: an upstream-agent-style message that causes the skill to load.
3. **Assertion-realism** — every assertion is either (a) a user-visible outcome (file created/modified, exit code, on-screen guidance text containing a documented phrase, manifest row appended) or (b) on the contract-assertion exception list. Allowed: `strong` / `mixed` / `weak`.
4. **Coverage** — at least one case exercises every documented capability of the primitive (the analyser prompt's hard rule 8).

### Bare-command exception register (locked at Phase 2)

A case may retain a bare prompt (e.g. `/z-eval-create`) iff one of:
- the case explicitly exercises a precondition-abort path (missing `.zoto/<plugin>/config.yml`, missing `HEAD`, missing `CURSOR_API_KEY`, etc.) AND the assertions check for the exact refuse message; OR
- the command's source markdown documents "command invoked with no args" as a distinct capability (e.g. `/z-spec-create` with no arguments enters the guided interview flow — this is documented behaviour).

Every such case MUST be listed in the register with: file path, case id, exemption reason (`precondition-abort:<refuse-message>` or `documented-no-args:<doc-section>`), AND a `start:end:plugins/.../<cmd>.md` code reference into the command's source markdown that documents the cited capability. Free-text justifications are not accepted.

### Contract-assertion exception list (locked at Phase 2)

Internal-mechanic assertions that may remain:
- `_meta.generated: true` carried on every generated case row (case-level guard, `_user-case-guards.ts`).
- `// _meta.generated\: true` on line 1 of `*.test.ts` / `*.test.tsx`, with backwards-compat scan over the first 20 lines (file-level guard, `_user-case-guards.ts`).
- `# _meta.generated\: True` on line 1 of `*.test.py` / `test_*.py` (file-level guard, `_user-case-guards.ts`).
- The exact precondition refuse message strings shipped by each command's source markdown (e.g. `Eval System is not initialised. Run` …, `Spec System is not initialised. Run` …).
- Analyser payload schema invariants: `schema_version: 1`, 64-hex `source_hash` pattern (`source_hash:\s*[0-9a-f]{64}`), colon-prefixed `target_id` (`^(skill|command|agent|hook|rule):`), `additionalProperties: false` rejection of surplus keys (per `analyser-payload.schema.json`).
- `manifest.history.yml` append-only invariant (history is never compacted or mutated).
- `fixture_justifications[]` cardinality: when `fixtures.files[]` is non-empty, `fixture_justifications[]` MUST be present with the same element count in the same order (analyser hard rule 6; downstream stamper refuses unjustified overlays).
- Comparer `/canvas` template byte-equality: assertions of the form "instructions block forwarded to `/canvas` is byte-equal to `plugins/zoto-eval-system/templates/canvas/compare-prompt.md.tmpl`" encode the analyser source's target-specific contract for `agent:zoto-eval-comparer`.
- `needs_user_input` payload-shape assertions mirroring `plugins/zoto-eval-system/templates/schema/needs-user-input.schema.json`.
- Cursor hooks contract: exit code 0, stdout being valid JSON, the documented `additional_context` key shape, and early-return `{}` on refused branches.

Any other internal-mechanic phrasing — `Available transcripts show zero askQuestion tool emissions`, `The spawned Task named X referenced the Y skill`, `Inside the generator flow the assistant invoked pnpm run …`, `traces show zoto-update-evals proving drift-free regenerated content`, etc. — is rewritten to a user-visible-outcome equivalent.

### Per-case audit report shape

For each file, produce a table:

| Case id | Current prompt (one-liner) | Realism | Invocation | Assertions | Coverage | Proposed action |
|---|---|---|---|---|---|---|

Plus a per-file narrative paragraph describing the most important rewrites and the seed source(s) chosen.

### Worked example mappings to surface in the rubric document

These are the high-signal "before / after" cases that Phase 3 will lean on most heavily — include each as a worked example in `realism-rubric.md`:

- `command:z-eval-create` case 2: bare `/z-eval-create` with assertions like "The spawned Task named `zoto-eval-generator` referenced the `zoto-create-evals` skill" → realistic: `/z-eval-create --approve-all skills,commands,agents,hooks` (or whatever the documented flag form is), with assertions checking for the post-scaffold guidance text the user sees plus the manifest row that lands.
- `agent:zoto-eval-generator` case 2: third-person operator narration → first-person parent-command-style request derived from a real transcript hit, with assertions checking the agent's structured `needs_user_input` payload shape and the eval-scaffold files that land.
- `hook:zoto-eval-system` case 1: invalid YAML config (already realistic; keep, just tighten assertions to focus on the stdout JSON shape rather than transcript-side observations).

### Rewrites payload schema

```jsonc
{
  "<repo-relative-path>": {
    "target_id": "command:z-eval-create",
    "container_shape": "cases[]" | "evals[]" | "mixed",
    "cases": {
      "<case_id-or-numeric-id>": {
        "preserve": false,
        "seed_source": "transcript:<uuid>" | "readme:<path>" | "skill-usage:<path>",
        "rewrite_prompt": "…",            // null if preserve === true
        "rewrite_follow_ups": ["…"],      // optional; null if no follow-ups
        "rewrite_assertions": ["…"],      // null only if preserve === true
        "rewrite_expected_output": "…",   // null if preserve === true
        "justification": "Replaces internal-mechanic assertion X with user-visible outcome Y; seed from transcript <uuid>."
      }
    }
  }
}
```

Phase 3 subtasks treat this payload as authoritative. They are not expected to re-classify cases.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Validate locally with:
- JSON parse check on `eval-rewrites.json`.
- For each file key in the rewrites payload, confirm the path exists on disk.

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
