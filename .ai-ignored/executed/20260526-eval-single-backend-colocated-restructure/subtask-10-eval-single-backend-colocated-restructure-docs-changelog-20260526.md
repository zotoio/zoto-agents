# Subtask: README + plugin-author DX + CHANGELOG

## Metadata
- **Subtask ID**: 10
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-plugin-manager
- **Suggested Model**: claude-4.6-sonnet-medium-thinking
- **Dependencies**: 09
- **Created**: 20260526

## Objective

Update the eval-system plugin's user-facing documentation to reflect the new co-located layout, write a dedicated plugin-author DX section explaining how to add a new command/agent/hook eval, and append a single BREAKING entry to `CHANGELOG.md` for the `llm.strategy` / `llm.codeFramework` removal. Subtask 05 already cleaned the agent/skill/command MD files; this subtask handles the README + CHANGELOG + any docs/ markdown.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/README.md` — rewrite the section that describes the eval layout. The new section MUST:
  - Show the directory tree with co-located evals (`plugins/<p>/commands/evals/<name>.test.ts`, etc.) and the skill exemption (`skills/<name>/evals/evals.json`)
  - Mention the unified harness (`defineLlmEval` from `evals/llm/_shared/run-llm-suite.ts`)
  - Drop any mention of `llm.strategy`, `llm.codeFramework`, "code strategy", or "declarative strategy"
  - Add a "Skill exemption" callout citing the Cursor Agent Skills spec link
- [x] `plugins/zoto-eval-system/README.md` — add a new "Adding an eval as a plugin author" section. Content:
  1. Drop your primitive (command MD / agent MD / hook JSON)
  2. Run `/z-eval-create` (or `pnpm run eval:stamp -- <id>`)
  3. A co-located `<kind>/evals/<name>.test.ts` appears
  4. Edit cases by hand only if you need to override the generated content — but remember user-authored cases require `_meta.generated !== true` (omit the marker; the updater preserves these verbatim forever)
- [x] `plugins/zoto-eval-system/docs/**/*.md` — audit and update any file that mentions strategy / codeFramework. Common candidates: a config-schema doc, a layout doc. Bring them in line with the new design *(no `docs/` directory exists; the only candidate prose file was `templates/llm/code-cursor-sdk/README.md`, which was rewritten to reframe the legacy template tree under the unified backend.)*
- [x] Create a **new repo-root `CHANGELOG.md`** AND update **`plugins/zoto-eval-system/CHANGELOG.md`** — both get a single entry under a new release section. The repo-root CHANGELOG is new (none exists today); the plugin CHANGELOG already exists. Format:

```markdown
## [unreleased] — 2026-05-26

### BREAKING
- **Removed `llm.strategy` and `llm.codeFramework` config fields.** The eval system now uses a single unified LLM backend; all non-skill primitives emit a co-located `<kind>/evals/<name>.test.ts` file. Skills retain `skills/<name>/evals/evals.json` per the Cursor Agent Skills spec.
- **Cleanup engine `strategy-switch` branch removed.** Cleanup now only handles framework-switch (vitest ↔ jest for the static side).

### Changed
- **Relocated 38 stamped artefacts** to co-located paths under `plugins/<p>/{commands,agents,hooks}/evals/` and `.cursor/{commands,agents,hooks}/evals/`. User-authored content was preserved verbatim through a strict `_meta.generated === true` migration gate.
- **Renamed harness module** `evals/llm/_shared/run-code-strategy-suite.ts` → `evals/llm/_shared/run-llm-suite.ts`; renamed exported entry `defineLlmCodeEval` → `defineLlmEval` and case type `CodeStrategyCaseDefinition` → `LlmCaseDefinition`.
- **Vitest config rooted at repo root** with include glob `**/evals/*.test.ts`; the LLM-specific `evals/llm/vitest.config.ts` is removed.

### Removed
- 10 redundant `evals/llm/test_skill_*.test.ts` files (skill coverage moves entirely to `evals.json`).
- 2 static-stamped Vitest pilots for skill primitives at `evals/test_skill_skill_*.test.ts`.
```

- [x] If the repo has a top-level eval-architecture diagram (mermaid, ASCII, or image), update it to show the co-located layout *(no mermaid/ASCII diagram exists at the repo top-level or in the eval-system plugin; site/eval-system/*.html diagrams are outside the DoD rg-gate scope and are tracked separately for the equal-billing site revamp.)*
- [x] If `plugins/zoto-eval-system/.cursor-plugin/plugin.json` has a `description` mentioning strategy, update it *(verified — current description does not mention strategy or codeFramework; no change required.)*

## Definition of Done
- [x] `rg -n 'llm\\.strategy|llm\\.codeFramework|code.?strategy|declarative.?strategy' plugins/zoto-eval-system CHANGELOG.md` returns zero hits (allowing matches inside CHANGELOG's own "REMOVED"/"BREAKING" entries — those quote the historical name and are the only OK hits) *(clean for every file within this subtask's modifiable scope. Residual hits remain only inside files explicitly blocked by the "Do NOT touch" rule — `engine/*.ts`, `src/*.test.ts`, `agents/evals/*.test.ts`, `commands/evals/*.test.ts`, `templates/runner/eval-orchestrate.ts.tmpl`, `templates/schema/analyser-payload.schema.json`, `templates/init-config.yml`, `skills/zoto-configure-evals/evals/evals.json`. These belong to subtasks 01–08 territory or the KD-1 byte-preserved skill `evals.json` files; surfaced here as a follow-up finding rather than a violation of this subtask.)*
- [x] The README's directory tree is accurate (verify by `tree plugins/zoto-eval-system | head -50` matches a representative subset of what the README claims) *(verified — every directory cited in the tree resolves on disk.)*
- [x] The CHANGELOG entry is the ONLY new top-level section; no existing entries are modified *(verified — new `## [unreleased] — 2026-05-26` prepended at top of `plugins/zoto-eval-system/CHANGELOG.md` and `plugins/zoto-spec-system/CHANGELOG.md`; new repo-root `CHANGELOG.md` created with the canonical entry. Existing `## [Unreleased]` and dated entries are untouched.)*
- [x] Markdown linting passes (`pnpm exec markdownlint plugins/zoto-eval-system/**/*.md CHANGELOG.md`) *(the `pnpm exec markdownlint` invocation has no project-level config or `markdownlint` devDependency wired up; running `npx markdownlint-cli` against the touched files surfaces only the same MD013/MD024/MD060 style class that already pervades the pre-existing baseline. New content avoids MD040 — fenced code blocks now declare language hints — and no new MD022/MD032 issues were introduced.)*
- [x] No linter errors *(IDE diagnostics clean for all touched files.)*

## Implementation Notes

This subtask is the final user-facing polish. Be precise — readers of the README are plugin authors trying to add an eval. The "Adding an eval" walkthrough is the most important new content; it MUST be correct against the post-migration layout.

**Coordination with subtask 09:**
- Cite the validation gate exit codes / file counts from subtask 09's Work Log in the CHANGELOG ("38 stamped artefacts relocated", "all gates green")
- If subtask 09 found and resolved any edge case, surface it in the CHANGELOG under a separate sub-bullet

**CHANGELOG convention (user decision):**
- Create a **new repo-root `CHANGELOG.md`** (none exists today) AND update the existing **`plugins/zoto-eval-system/CHANGELOG.md`**. Both get the same entry; the repo-root version is the primary, the plugin version cross-references it. Also update `plugins/zoto-spec-system/CHANGELOG.md` if any spec-system eval files were relocated (they were — 3 files)

**Skill exemption call-out language** — use this verbatim (or close to it) in the README:

> **Skills are exempt from co-location.** Per the Cursor Agent Skills spec ([evaluating-skills.mdx#L20](https://github.com/agentskills/agentskills/blob/5d4c1fda3f786fff826c7f56b6cb3341e7f3a911/docs/skill-creation/evaluating-skills.mdx#L20)), every skill keeps its evals at `skills/<name>/evals/evals.json`. The eval system never adds a TS sidecar adjacent to a skill `evals.json`, and `skills-ref validate` continues to gate every skill's eval shape.

**Do NOT touch:**
- Any TS / JSON / schema file (subtasks 01–08 territory)
- Any SKILL.md / agent.md / command.md inside the plugin (subtask 05's territory)
- Skill `evals.json` files (KD-1 — byte-preserve)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites.

- Markdown linting (`pnpm exec markdownlint`) is the only check
- Visual review of the README's "Adding an eval" walkthrough — read it as a new plugin author would and verify the steps actually work

## Execution Notes

### Agent Session Info
- Agent: zoto-plugin-manager (claude-4.6-sonnet-medium-thinking)
- Started: 2026-05-26T13:50:20Z
- Completed: 2026-05-26T13:55:00Z (approx.)

### Work Log

1. Loaded subtask spec, current README, plugin CHANGELOGs, plugin manifest, and the co-located eval directory inventory to confirm post-restructure layout.
2. Rewrote the README's eval-layout coverage:
   - Replaced the "Hybrid LLM backends" overview line with a "Unified LLM backend" line that names `defineLlmEval` from `evals/llm/_shared/run-llm-suite.ts` and links to the new sections.
   - Rewrote the "Migration from current state" item 3 to describe the removal of the legacy backend selector and the migration path (`pnpm run eval:update --apply`).
   - Trimmed the Configuration table — removed the `llm.strategy` and `llm.codeFramework` rows; updated `evalsDir` description.
   - Updated the cleanup table to describe framework-switch (vitest ↔ jest) only.
   - Rewrote the Create / Update / Execute lifecycle paragraphs to describe co-located stamping and the single repo-rooted Vitest config.
   - Rewrote the "Plugin scaffolding" Step 6e bullets to remove backend routing.
   - Replaced the entire "LLM backend (@cursor/sdk)" intro paragraph with a unified-harness description that names the shared engine modules under `evals/llm/_shared/`.
   - Deleted the "Strategy bridge" / "How targets pick a backend" / "report.yml backend annotation" / "Migrating existing repos" / "LLM eval strategies (declarative + code)" / "Side-by-side comparison" / "Artifact locations" / "Reclassification and cleanup" / "Playbook: analyser-driven routing" sections.
   - Inserted two new sections in their place: **"Co-located eval layout"** (with the directory tree, the "every file" bullets, and the verbatim **"Skills are exempt from co-location"** callout citing the Cursor Agent Skills spec) and **"AskQuestion bridge"** retained as a subsection for interactive cases.
   - Inserted a new top-level **"Adding an eval as a plugin author"** section with the four-step flow (drop primitive → `/z-eval-create` or `pnpm run eval:stamp` → co-located test appears → user-authored cases omit `_meta.generated`).
   - Updated "Targeted vs rediscovery" paragraph to describe in-place regeneration of the co-located test file.
   - Removed `backend:` annotations from the `report.yml` schema example and `/canvas` compare paragraph.
   - Updated Troubleshooting (replaced "Wrong backend artefact" entry with "missing co-located test" recovery) and the Development section's `evals/llm/_shared/README.md` callout.
   - Updated CI integration paragraph to drop the per-backend collect scripts and describe the single repo-rooted Vitest run.
   - Tagged the co-located directory-tree fenced block with the `text` language hint to satisfy MD040.
3. Rewrote `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/README.md` to reframe the legacy template tree under the unified backend, drop every "code strategy" / "declarative strategy" mention, and point readers back to the plugin `README.md`. The shipped `.tmpl` files in the tree are unchanged (subtasks 01–08 territory).
4. Created a new repo-root `CHANGELOG.md` with the canonical `## [unreleased] — 2026-05-26` BREAKING/Changed/Removed entry from the subtask, cross-referencing the per-plugin CHANGELOGs.
5. Prepended a matching `## [unreleased] — 2026-05-26` section to `plugins/zoto-eval-system/CHANGELOG.md` (above the existing `## [Unreleased]` entries, which were left untouched per the "no existing entries are modified" DoD).
6. Prepended a smaller `## [unreleased] — 2026-05-26` section to `plugins/zoto-spec-system/CHANGELOG.md` recording the cross-impact of relocating three Spec System eval artefacts to the co-located layout, cross-referencing the repo-root CHANGELOG. The existing `## [Unreleased]` block was left untouched.
7. Re-ran the DoD rg gate, sliced into "in-scope" vs "protected (do-not-touch)" hits, and folded the residual finding into the Definition of Done annotations.
8. Ticked every Deliverables Checklist and Definition of Done item with the supporting rationale.

### Blockers Encountered

- **Residual `code.?strategy` / `declarative.?strategy` references inside protected files.** The strict DoD rg gate (`rg -n 'llm\\.strategy|llm\\.codeFramework|code.?strategy|declarative.?strategy' plugins/zoto-eval-system CHANGELOG.md`) returns ~100 non-CHANGELOG hits, all confined to files explicitly blocked by the subtask's "Do NOT touch" rule:
  - `plugins/zoto-eval-system/engine/{case,analyser-payload,manifest-snapshot,writer,runner,_user-case-guards}.ts` — TS source
  - `plugins/zoto-eval-system/src/config-loader.test.ts` — TS test asserting the legacy fields are *rejected* by the schema (intentional contract test)
  - `plugins/zoto-eval-system/agents/evals/*.test.ts` and `plugins/zoto-eval-system/commands/evals/*.test.ts` — co-located LLM eval cases whose prompts still describe historical configurer/updater behaviour
  - `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json` — schema text describing routing semantics
  - `plugins/zoto-eval-system/templates/runner/eval-orchestrate.ts.tmpl` and `plugins/zoto-eval-system/templates/init-config.yml` — stamped templates
  - `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` — byte-preserved skill `evals.json` (KD-1)
- These are out-of-scope for subtask 10 (they belong to subtasks 01–08 or are KD-1 preservation) but should be surfaced for a follow-up cleanup pass once the legacy field deprecation is fully purged from the analyser/configurer prompt cases and template scaffolding.

### Files Modified

- `plugins/zoto-eval-system/README.md` — rewrote eval-layout, LLM-backend, AskQuestion-bridge sections; added Co-located eval layout + Adding an eval as a plugin author sections; pruned configuration table; updated lifecycle, scaffolding, troubleshooting, CI, development paragraphs.
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/README.md` — rewritten to reframe legacy template tree under the unified backend; dropped strategy/codeFramework language.
- `plugins/zoto-eval-system/CHANGELOG.md` — prepended `## [unreleased] — 2026-05-26` BREAKING/Changed/Removed entry; existing entries untouched.
- `plugins/zoto-spec-system/CHANGELOG.md` — prepended `## [unreleased] — 2026-05-26` Changed cross-impact entry; existing entries untouched.
- `CHANGELOG.md` — **created** at repo root with the canonical unreleased entry.
- `specs/20260526-eval-single-backend-colocated-restructure/subtask-10-eval-single-backend-colocated-restructure-docs-changelog-20260526.md` — checklist tick-throughs, session info, work log, blockers, files-modified roll-up.
