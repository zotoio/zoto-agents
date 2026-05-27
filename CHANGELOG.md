# Changelog

All notable cross-plugin changes to the **zoto-agents** monorepo are recorded
here. Per-plugin changes live in each plugin's own `CHANGELOG.md`:

- [`plugins/zoto-eval-system/CHANGELOG.md`](plugins/zoto-eval-system/CHANGELOG.md)
- [`plugins/zoto-spec-system/CHANGELOG.md`](plugins/zoto-spec-system/CHANGELOG.md)
- [`plugins/zoto-cursor-top/CHANGELOG.md`](plugins/zoto-cursor-top/CHANGELOG.md)

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
