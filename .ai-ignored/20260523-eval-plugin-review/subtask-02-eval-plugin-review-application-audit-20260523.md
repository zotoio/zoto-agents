# Subtask: Repo Application Audit & Monorepo Integration Assessment

## Metadata
- **Subtask ID**: 02
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: None
- **Created**: 20260523

## Objective

Audit how the `zoto-eval-system` plugin is currently **applied** to the
`zoto-agents` monorepo, and assess the gap between the in-monorepo plugin
location (`plugins/zoto-eval-system/`) and the authoritative local-development
copy at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`. The output is
a state report that subtasks 06 and 09 build on.

## Deliverables Checklist

- [x] `findings-02-application-audit.md` containing:
  - [x] **Config snapshot**: current contents and validity of `.zoto/eval-system/config.yml` (note that every key is currently commented out — record which defaults are therefore in effect).
  - [x] **Manifest state**: presence/absence of `.zoto/eval-system/manifest.yml` and `.zoto/eval-system/manifest.history.yml`. Implications for whether `/z-eval-create` was ever run.
  - [x] **Cache state**: contents of `.zoto/eval-system/cache/` — size, age, what kind of analyser payloads are cached.
  - [x] **Evals tree state**: contents and emptiness of `evals/llm/` and `evals/__pycache__/`. Note absence of any stamped `_llm/` runner, declarative `evals.json`, or static pytest tree at the host root.
  - [x] **Run-artefact accumulation**: count of directories under `evals/_runs/`, oldest and newest timestamps, total disk usage, comparison vs default `runs.retention: 30`. Flag as cleanup candidate (do **not** apply `eval:gc`).
  - [x] **Host package.json wiring**: list of `eval*` scripts present (or absent) in root `package.json`. Confirm whether the orchestrator scripts the plugin would stamp are present.
  - [x] **Per-plugin local evals**: enumeration of every existing `plugins/*/skills/*/evals/` directory (independent of zoto-eval-system stamping) — what's there today, are they still in the form the plugin expects.
  - [x] **In-monorepo vs local-copy gap**: file-level diff summary — what files exist in `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` but are missing from `plugins/zoto-eval-system/`. Quantify (count + total LOC missing).
  - [x] **Marketplace registration**: confirm whether `zoto-eval-system` is listed in `/home/andrewv/git/cursor/zoto-agents/.cursor-plugin/marketplace.json`. If absent, characterise the consequence (the plugin would not publish via the marketplace flow). Severity is **expected blocker** for an absent entry — confirm empirically and grade in the state summary, do not pre-declare.
  - [x] **Drift status**: if a `manifest.yml` exists, run `pnpm run eval:update --check` mentally (do not invoke) and document expected behaviour.
- [x] **State summary table** with columns: artefact / present? / current vs expected / severity (info | warn | blocker).
- [x] No file mutations.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-02/`.
- [x] State summary table includes every artefact named in the deliverables checklist.
- [x] Any row graded `blocker` during the audit has a concrete remediation hint for subtask 09 to consume. (No blockers required to exist — grade empirically.)
- [x] No `evals/`, `.zoto/`, `marketplace.json`, or `package.json` mutations.
- [x] **Explicit no-copy gate**: the audit does NOT copy, sync, or otherwise propagate content from `~/.cursor/plugins/local/zoto-eval-system/` into `plugins/zoto-eval-system/`. Closing that gap is a planned action for the follow-up implementation spec, not this audit.

## Implementation Notes

- Path crib:
  - Repo root: `/home/andrewv/git/cursor/zoto-agents/`
  - Applied state: `.zoto/eval-system/`
  - Eval artefacts: `evals/` (incl. `evals/llm/`, `evals/_runs/`)
  - Host scripts: `package.json` and `scripts/`
  - Marketplace manifest: `.cursor-plugin/marketplace.json`
  - Plugin in-monorepo path: `plugins/zoto-eval-system/`
  - Plugin authoritative local copy: `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`
- Avoid recursive deep reads — use `ls`, `find`, `wc -l`, and targeted `Read` only when characterising specific files.
- Do not run any eval script (`pnpm run eval*`). This is read-only state capture.
- The **gap** between the empty in-monorepo path and the populated local copy is the central finding for marketplace-readiness; quantify it (#files, #LOC, #components) so subtask 09 can size remediation.
- Note that `evals/llm/` only contains `node_modules` — meaning no stamping ever ran here.

## Testing Strategy

**IMPORTANT**: Read-only state capture. Do NOT trigger:
- Any `pnpm run eval*` script (incl. `eval`, `eval:full`, `eval:update`, `eval:gc`, `eval:cleanup-stale`).
- Any global test suite.
- The plugin's hook scripts.

Verification is by self-review against the deliverables checklist.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer (Codex 5.3)
- Started: 2026-05-23 22:47 AEST (+1000)
- Completed: 2026-05-23 22:50 AEST (+1000)

### Work Log
- Loaded subtask + parent spec and confirmed read-only/no-copy constraints.
- Audited `.zoto/eval-system/config.yml`; verified it is comment-only and mapped effective defaults from local plugin `config.schema.json`.
- Captured presence/absence state for manifest and manifest history under `.zoto/eval-system/`.
- Enumerated cache contents, size, oldest/newest files, and analyser payload kind distribution.
- Audited `evals/` tree state, including `evals/llm/`, `evals/__pycache__/`, absence of `_llm` and static stamped trees.
- Counted `evals/_runs/` directories, measured retention overage vs default 30, and recorded timestamp range + disk usage.
- Checked root `package.json` for `eval*` scripts and compared against expected script surface from plugin template.
- Enumerated existing `plugins/*/skills/*/evals/` directories and checked their shape against expected `evals/evals.json`.
- Quantified in-monorepo vs local-copy plugin gap (missing files + LOC + component breakdown + full missing-file appendix).
- Verified marketplace registration status and documented publish-flow consequence.
- Documented drift-check expected behaviour from `zoto-update-evals` contract (mental execution only; command not run).
- Wrote findings report: `specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md`.
- Completed checklist + DoD tick-through and recorded files modified.

### Blockers Encountered
- None during execution.

### Files Modified
- `specs/20260523-eval-plugin-review/subtask-02-eval-plugin-review-application-audit-20260523.md`
- `specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md`
