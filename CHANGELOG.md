# Changelog

## 2026-10-29 — Marketplace `v0.8.0` (`zoto-botz-skills v0.4.0` & `botz-mcp-swarm v0.11.0`)

- **`zoto-botz-skills` (`0.4.0`, skill `v6`)**: Full 7-stage MCP specification coverage for `https://mcp.botz.ai/mcp` (24 tools with `outputSchema` + `structuredContent` and 5-field `ToolAnnotations`, 4 `@mcp.prompt` slash workflows `/use_skill`, `/author_skill`, `/evolve_skill`, `/delegate_subagent`, 16 resource URI templates including binary `BlobResourceContents` on `skill://{name}/illustration`, `completion/complete`, 4-stage `notifications/progress`, client `sampling/createMessage` & `roots/list`, `BoundedMemoryEventStore` SSE resumability, and `swarm_run_completed` lifecycle).
- **`botz-mcp-swarm` (`0.11.0`, CLI `0.13.0`)**: Documents the 28-tool `https://swarm.botz.ai/mcp` Streamable-HTTP MCP Server, 4 `@mcp.prompt` workflows (`/swarm_remediate_latest_run`, `/audit_mcp_server`, `/triage_suite_run`, `/soak_test_plan`), load profile presets (`smoke`, `baseline`, `peak`, `spike`, `soak: 10 VUs · 1h · ~4 TPS/user`), `--skip-image-gen` & `--skip-expensive-llm`, `signalCalleeRunCompleted` + `swarm_run_cleanup_assets`, and full 7-stage MCP client & contract verification.

All notable cross-plugin changes to the **zoto-agents** monorepo are recorded
here. Per-plugin changes live in each plugin's own `CHANGELOG.md`:

- [`plugins/zoto-eval-system/CHANGELOG.md`](plugins/zoto-eval-system/CHANGELOG.md)
- [`plugins/zoto-spec-system/CHANGELOG.md`](plugins/zoto-spec-system/CHANGELOG.md)
- [`plugins/zoto-cursor-top/CHANGELOG.md`](plugins/zoto-cursor-top/CHANGELOG.md)
- [`plugins/botz-mcp-swarm/CHANGELOG.md`](plugins/botz-mcp-swarm/CHANGELOG.md)
- [`plugins/crux-compress/CHANGELOG.md`](plugins/crux-compress/CHANGELOG.md)
- [`plugins/zoto-botz-skills/CHANGELOG.md`](plugins/zoto-botz-skills/CHANGELOG.md)

## [unreleased] — 2026-10-23

### `zoto-botz-skills` plugin

- Add `zoto-botz-skills` 0.2.0, moved from `zotoio/botz-mcp` (`marketplace/botz-skills/`). It ships the `botz-mcp` client skill, `/z-botz-mcp`, and a `botz` MCP entry for `https://mcp.botz.ai/mcp` (OAuth, no static tokens), and is registered in all three marketplaces. Docs page at `site/botz-skills/`.

## [unreleased] — 2026-10-14

### `crux-compress` plugin

- Add `crux-compress` 2.11.8, which packages the [CRUX-Compress](https://github.com/zotoio/CRUX-Compress) v2.11.8 release as a plugin and registers it in all three marketplaces. `plugins/crux-compress/scripts/sync-upstream.mjs` rebuilds it from a release.

### `/z-<skill>` commands

- Every skill in a plugin gets a light wrapper command `commands/z-<skill>.md` (run as `/z-<skill>`) with evals. `botz-mcp-swarm` 0.8.0 adds one per skill. `validate-template` enforces the convention for every plugin except `zoto-spec-system`, `zoto-eval-system`, and `zoto-cursor-top`, and `docs/add-a-plugin.md` and the `zoto-create-plugin` skill describe it.

### Claude Code and Codex marketplaces

- Every plugin now ships an [Agent Plugins](https://agent-plugins.org/) `plugin.json` with OpenAI metadata under `extensions["com.openai"]` and a `.claude-plugin/plugin.json`, alongside its Cursor manifest.
- Add `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`, listing the same plugins as `.cursor-plugin/marketplace.json`. `pnpm validate-template` fails if a manifest or marketplace entry is missing or its name or version differs.
- Add the `botz-mcp-swarm` plugin (MCP Swarm skills), moved from `@zotoio/botz-mcp-swarm-cli`.
- Every plugin's OpenAI metadata sets `interface.logo` and `interface.composerIcon`, which Codex requires. `validate-template` checks both point to existing square PNG, JPEG, WebP, or SVG images of at least 48x48 and at most 5 MiB.
- Cursor-format hooks, `.mdc` rules, and Cursor-specific agent fields are ignored by Claude Code and Codex; skills, commands, and agents load in Claude Code, and skills load in Codex.

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
