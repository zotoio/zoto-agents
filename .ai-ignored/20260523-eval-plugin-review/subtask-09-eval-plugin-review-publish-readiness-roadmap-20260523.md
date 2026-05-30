# Subtask: Publish-Readiness Audit & Consolidated Remediation Roadmap

## Metadata
- **Subtask ID**: 09
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-plugin-manager
- **Dependencies**: 03, 04, 05, 06, 07, 08 (01 and 02 are transitive via Phase-2 subtasks)
- **Created**: 20260523

## Objective

Consolidate every Phase-1 and Phase-2 finding into a single **publish-readiness
roadmap** the user can action. This subtask answers two questions:

1. *Could this plugin be published to the Cursor marketplace today, as-is?*
   (Pass/fail with reasoned justification.)
2. *What is the minimum, ordered set of changes required to make it publish-ready?*
   (Ranked roadmap with effort estimates and severity tags.)

This is the **only Phase-3 subtask** and the final deliverable of the spec.

## Deliverables Checklist

- [x] `findings-09-publish-readiness-roadmap.md` consolidating prior findings:

  - [x] **Marketplace-readiness checklist** (per the `zoto-plugin-conventions.mdc` workspace rule):
    - [x] `.cursor-plugin/plugin.json` — `name`, `displayName`, `version`, `description`, `author`, `license` present and consistent.
    - [x] Entry in `.cursor-plugin/marketplace.json` at the monorepo root — **expected blocker** if subtask 02 confirms it is absent. Take the severity from subtask 02's empirical grading, not from this checklist.
    - [x] `README.md` ≥ 50 lines (currently 500 — passes).
    - [x] `LICENSE` file present (currently MIT — passes per subtask 08).
    - [x] `CHANGELOG.md` present and current — assess `[Unreleased]` from subtask 08.
    - [x] Plugin name kebab-case, no leading/trailing/consecutive hyphens.
    - [x] Skill directory name matches `name` in frontmatter (per workspace rule).
    - [x] Every skill has `evals/evals.json` with ≥ 2 cases and assertions.
    - [x] `SKILL.md` ≤ 500 lines (subtask 08 spot-check).
    - [x] `node scripts/validate-template.mjs` passes (subtask 05 captures result).
    - [x] `node scripts/validate-skills.mjs` passes (subtask 05 captures result).
    - [x] `pnpm test` passes (deferred — see Testing Strategy below).

  - [x] **Source-of-truth resolution plan**: how to close the gap between the empty in-monorepo `plugins/zoto-eval-system/` and the populated local copy. Options to evaluate:
    - Sync local copy into the monorepo path and treat the monorepo as canonical going forward.
    - Treat local copy as canonical and document the dev workflow.
    - Hybrid: monorepo as source, local copy as install symlink.
    - Recommend one with rationale.

  - [x] **Severity-grouped findings ledger** consolidating subtasks 03–08:
    - **Blocker** — must fix before publish (e.g. missing marketplace entry, source-of-truth gap, validation failures).
    - **Major** — should fix before publish (e.g. redundant aliases, hard-coded contract surfacing inconsistencies).
    - **Minor** — should fix soon (e.g. README footnote claim, CHANGELOG hygiene).
    - **Info** — track for future work.

  - [x] **Effort-sized remediation roadmap** with ordered steps:
    - Step name, severity, owner subagent (for the follow-up implementation spec), dependencies on other steps, S/M/L effort.
    - Group steps into logical PR-sized batches.

  - [x] **No-host-coupling check**: does the plugin assume anything specific to the `zoto-agents` monorepo (paths, package names, conventions)? Subtasks 02 + 05 input.

  - [x] **Security & CI/CD posture**:
    - Secrets handling (`CURSOR_API_KEY` flow — subtask 06 input).
    - `.env` / `.env.example` discipline.
    - Pre-commit / CI gating on `eval:update --check`.
    - Any obvious supply-chain risk in `node_modules/` checked into the plugin (subtask 05 input).

  - [x] **Target-state definition**: a short paragraph describing what "publish-ready" looks like for this plugin, against which a follow-up implementation spec can be measured.

  - [x] **Recommended next steps**: the user's choices —
    - (a) Cut a v0.4.0 implementation spec from this roadmap.
    - (b) Park the plugin and consolidate findings into a longer-horizon redesign.
    - (c) Ship as v0.3.2 patch with only blocker-fixes and defer majors.
    - For each option: what the user gives up, what they get, expected timeline.

  - [x] **Verdict**: explicit "publish-ready: yes / no / yes-with-conditions" with one-line justification.

- [x] **No file mutations** outside `specs/20260523-eval-plugin-review/`.
- [x] **No application of fixes** — this subtask is the roadmap, not the implementation.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-09/`.
- [x] Every checklist item from "Marketplace-readiness checklist" has a pass/fail/n-a verdict with citation.
- [x] Severity-grouped ledger has at least the blockers and majors enumerated; minors and infos may be sampled.
- [x] Roadmap is ordered (no forward-references to later steps).
- [x] Verdict is unambiguous.
- [x] No mutations outside this subtask's directory.
- [x] No `evals/`, `marketplace.json`, `package.json`, plugin source, or schema mutations.
- [x] **Explicit no-copy gate**: the roadmap may *recommend* copying or syncing content from `~/.cursor/plugins/local/zoto-eval-system/` into `plugins/zoto-eval-system/`, but this subtask does NOT perform that copy. Application of the recommendation belongs to a follow-up implementation spec.

## Implementation Notes

- Read every prior subtask's findings document before drafting this roadmap. Cite them as `start:end:specs/20260523-eval-plugin-review/findings-NN/...`.
- The user has pre-authorised "analysis only" — do **not** apply fixes even if they are trivial. A future implementation spec will action this roadmap.
- The marketplace-registration gap is the single most likely "obvious blocker"; treat it as the first step of the roadmap.
- The source-of-truth gap is the single most likely "obvious major"; treat it as a structural fix, not a one-line edit.
- Be explicit about effort: a roadmap that says "fix all the things" is not actionable. Effort sizing (S = < 30 min, M = half day, L = full day or more) anchors the user's planning.

## Testing Strategy

**IMPORTANT**: Analysis only. Do NOT run `pnpm test`, `pnpm validate`, `pnpm run eval*`, or any global test suite during this subtask. Capture and consume the validation results from subtask 05 instead.

If `pnpm test` status is unknown after subtask 05, document that gap rather than running it here — that keeps this subtask deterministic and within scope.

## Execution Notes

### Agent Session Info
- Agent: zoto-plugin-manager
- Started: 2026-05-23
- Completed: 2026-05-23

### Work Log
- Consumed findings-01 through findings-08; drafted `findings-09-publish-readiness-roadmap.md` per DoD (checklist citations, ledger, ordered roadmap ×14 steps, batches PR-A–PR-F, security/CI posture, verdict **No**).
- No-copy gate: roadmap step 1 recommends sync only — no filesystem copy executed.

### Blockers Encountered
- None affecting analysis deliverable.

### Files Modified
- `specs/20260523-eval-plugin-review/findings-09/findings-09-publish-readiness-roadmap.md` (created)
- `specs/20260523-eval-plugin-review/subtask-09-eval-plugin-review-publish-readiness-roadmap-20260523.md` (execution notes + checklist ticks)

### Adversarial Verification (independent judge, 2026-05-23)
- **Verdict: Verified.** All 22/22 Deliverables Checklist ticks and 8/8 Definition of Done ticks confirmed against the filesystem.
- **9-section coverage:** 9/9 required sections present and substantive in `findings-09-publish-readiness-roadmap.md` (marketplace checklist, source-of-truth plan, ledger, roadmap, no-host-coupling, security/CI, target state, next steps, verdict).
- **Marketplace checklist spot-checks (4/4 match reality):**
  - Row 1 `plugin.json` fields — local mirror confirmed with `name=zoto-eval-system`, `displayName=Eval System`, `version=0.3.1`, `author=zotoio`, `license=MIT`.
  - Row 2 `marketplace.json` entry — confirmed absent; root manifest lists only `zoto-spec-system` and `zoto-cursor-top`.
  - Row 5 `CHANGELOG` vs `0.3.1` — confirmed FAIL; `[Unreleased]` holds shipping-facing notes, no `0.3.1` section between `[Unreleased]` and `[0.1.0]`.
  - Row 6 kebab-case name — confirmed PASS (`zoto-eval-system`).
- **Ledger counts:** Blockers `B1`–`B6` = 6 rows; Majors `Mj1`–`Mj7` = 7 rows — matches the appendix.
- **Roadmap:** 14 steps confirmed; dependency column inspected — every `Deps` reference points to a strictly lower step number (no forward references).
- **Cross-citation:** all 8 prior findings docs cited (`findings-01` through `findings-08`) — exceeds the ≥6/8 threshold.
- **No-copy gate:** `plugins/zoto-eval-system/` still contains only `templates/env/.env.example.tmpl` + `node_modules/` (unchanged); roadmap step 1 recommends but does not execute the sync.
- **Scope discipline:** `git status` confirms the only files this subtask added are under `specs/20260523-eval-plugin-review/`; all other working-tree changes (`.crux/`, CRUX skill/command/agent edits, `AGENTS.md`, `CRUX.md`, `.cursor/agents/zoto-eval-architect.md`, `.cursor/agents/zoto-eval-engineer.md`, `.zoto/`) pre-existed at the start of this subtask.
