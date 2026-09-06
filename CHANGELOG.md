# Changelog

All notable cross-plugin changes to the **zoto-agents** monorepo are recorded
here. Per-plugin changes live in each plugin's own `CHANGELOG.md`:

- [`plugins/zoto-eval-system/CHANGELOG.md`](plugins/zoto-eval-system/CHANGELOG.md)
- [`plugins/zoto-spec-system/CHANGELOG.md`](plugins/zoto-spec-system/CHANGELOG.md)
- [`plugins/zoto-cursor-top/CHANGELOG.md`](plugins/zoto-cursor-top/CHANGELOG.md)

## [unreleased] — 2026-09-06

### Changed — local plugin management

- **Removed the `sync-plugins` hook pipeline** (`.cursor/hooks/sync-plugins.mjs`, the `sessionStart` / `afterFileEdit` / `stop` hooks in `.cursor/hooks.json`, `/sync-plugins`, and its eval). Plugins are no longer mirrored to `~/.cursor/plugins/local/` on every edit.
- **New `/install-local-plugins` and `/uninstall-local-plugins` commands** — interactive multiselect over the monorepo plugins that run each plugin's own `install-local` / `uninstall-local` script. Every plugin now installs to the single shared target **`~/.cursor/plugins/local/<name>/`** and cleans up the legacy `~/.cursor/plugins/<name>/` copy (see each plugin's `CHANGELOG.md`).

### Fixed

- Eval-system discovery could not see co-located `<kind>/evals/<name>.json` files, so `eval:update --check` reported "no eval coverage" for every new command/agent/hook. See [`plugins/zoto-eval-system/CHANGELOG.md`](plugins/zoto-eval-system/CHANGELOG.md).
- cursor-top process classification on Linux/macOS/Windows and the `SDK` vs `CLD` agent distinction. See [`plugins/zoto-cursor-top/CHANGELOG.md`](plugins/zoto-cursor-top/CHANGELOG.md).
- **LLM evals could bill without `--full`.** Any `vitest run --config evals/vitest.config.ts` executed paid LLM cases whenever `CURSOR_API_KEY` was in `.env`. LLM cases now require the explicit `ZOTO_EVAL_LLM=1` opt-in that only `eval:full` / `eval:llm` set. See the eval-system CHANGELOG.
- `eval:update --apply --no-analyser` no longer stamps stale cached analysis over drifted targets, and surgical case removal no longer leaves invalid JSON (`,]`).
- `tsc --noEmit` is clean in all three plugins (was 19 / 78 / 2 errors); `zoto-eval-system` and `zoto-spec-system` tsconfigs now match their tsx-only runtime (`ESNext` / `Bundler`, `allowImportingTsExtensions`, `noEmit`). Fixed a masked runtime bug on the way: `loadEvalPaths(...).paths.manifestPathAbs` always threw and fell back to the default manifest path.
- cursor-top unit tests no longer call the live Cloud Agents API when `CURSOR_API_KEY` is exported.

### Housekeeping

- Untracked force-added artefacts: 8 files under `evals/_runs/` and the dangling `.zoto/eval-system/bin/cursor-top` symlink. Analyser cache payloads stay tracked on purpose (CI `--no-analyser`) and `.gitignore` now says so.
- Removed the unreferenced `tsconfig.tests.json` and the duplicate root `json-source-map` dependency.
- The seven vendored `/crux-*` commands now carry `name` / `description` frontmatter per the plugin conventions rule.

## [unreleased] — 2026-05-27

### BREAKING — Evals JSON-first migration

See [`plugins/zoto-eval-system/CHANGELOG.md`](plugins/zoto-eval-system/CHANGELOG.md) for the full entry. Summary:

- All non-skill primitive evals migrate from co-located `.test.ts` to `.json` files discovered by the Vitest JSON loader plugin.
- New `runner` + `parameters` case shape for advanced TypeScript flows; multi-primitive scenarios live under `evals/scenarios/`.
- The standalone `eval:llm` script is removed; the unified `evals/vitest.config.ts` handles everything.
- Idempotent migration via `scripts/eval-migrate-ts-to-json.ts`.

## [unreleased] — 2026-05-26

### BREAKING

- **Removed `llm.strategy` and `llm.codeFramework` config fields.** The eval system now uses a single unified LLM backend; all non-skill primitives emit a co-located `<kind>/evals/<name>.test.ts` file. Skills retain `skills/<name>/evals/evals.json` per the [Cursor Agent Skills spec](https://github.com/agentskills/agentskills/blob/5d4c1fda3f786fff826c7f56b6cb3341e7f3a911/docs/skill-creation/evaluating-skills.mdx#L20).
- **Cleanup engine `strategy-switch` branch removed.** Cleanup now only handles framework-switch (vitest ↔ jest for the static side).

### Changed

- **Relocated 38 stamped artefacts** to co-located paths under `plugins/<p>/{commands,agents,hooks}/evals/` and `.cursor/{commands,agents,hooks}/evals/`. User-authored content was preserved verbatim through a strict `_meta.generated === true` migration gate.
- **Renamed harness module** `evals/llm/_shared/run-code-strategy-suite.ts` → `evals/llm/_shared/run-llm-suite.ts`; renamed exported entry `defineLlmCodeEval` → `defineLlmEval` and case type `CodeStrategyCaseDefinition` → `LlmCaseDefinition`.
- **Vitest config rooted at repo root** with include glob `**/evals/*.test.ts`; the LLM-specific `evals/llm/vitest.config.ts` is removed.
- **Validation gate green** post-migration: `eval:list` → exit 0, 14 generated eval files / 116 cases; Vitest discovers 39 test files (38 co-located + 1 smoke), all pass/skip cleanly; re-running the migration is a no-op (idempotent); all 14 skill `evals.json` files byte-preserved.

### Removed

- 10 redundant `evals/llm/test_skill_*.test.ts` files (skill coverage moves entirely to `evals.json`).
- 2 static-stamped Vitest pilots for skill primitives at `evals/test_skill_skill_*.test.ts`.
