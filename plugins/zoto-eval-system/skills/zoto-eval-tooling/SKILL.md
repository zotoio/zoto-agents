---
name: zoto-eval-tooling
description: Invocation reference for all eval-system CLI commands. Use this skill when you need to run eval scripts — never reference script paths directly; always invoke via the package.json aliases documented here.
---

# Eval System CLI Tooling

This skill is the **single source of truth** for how agents invoke eval-system CLI commands. All commands are available as `pnpm run eval:<name>` aliases defined in the host repo's `package.json`. Agents and skills MUST invoke these aliases — never reference the underlying TypeScript file paths directly.

## Commands

### `pnpm run eval:discover`

Discover eval targets in the host repository.

| Detail | Value |
|--------|-------|
| **Purpose** | Walk configured `skillsRoots` and `discoveryTargets`, emit a manifest-shaped YAML payload |
| **Args** | `-- --resolve <file>` — resolve a single file to its target ID(s) |
| **Output** | YAML on stdout (manifest shape) |
| **Exit codes** | 0 = success, 1 = missing config |
| **Config fields used** | `skillsRoots`, `discoveryTargets`, `evalsDir`, `ignore` |

### `pnpm run eval:analyse`

Run the LLM-driven primitive analyser on one or more targets.

| Detail | Value |
|--------|-------|
| **Purpose** | Produce an `AnalyserPayload` (JSON) per primitive via `@cursor/sdk` |
| **Args** | `-- <target-id> [--target <glob>] [--pretty] [--dry-run]` |
| **Output** | JSON on stdout per target; cache written to `.zoto/eval-system/cache/analyser/` |
| **Exit codes** | 0 = success, 1 = error, 2 = budget exhausted |
| **Config fields used** | `llm.model.id`, `analyser.concurrency`, `analyser.maxCallsPerInvocation`, `ignore` |
| **Schema** | Output validated against `templates/schema/analyser-payload.schema.json` |

### `pnpm run eval:stamp`

Stamp (generate) per-primitive eval test files from an analyser payload.

| Detail | Value |
|--------|-------|
| **Purpose** | Emit deterministic test files for pytest / vitest / jest backends |
| **Args** | `-- <target-id> [--dry-run] [--baseline-only]` |
| **Output** | Files written under `{evalsDir}/`; stdout reports paths written |
| **Exit codes** | 0 = success, 1 = error (missing payload, bad target) |
| **Config fields used** | `static.framework`, `llm.strategy`, `llm.codeFramework`, `evalsDir` |
| **Note** | Refuses `skill:*` targets — skills use `templates/skill-evals/evals.json.tmpl` directly |

### `pnpm run eval:cleanup-stale`

Enumerate (dry-run) or delete stale framework/strategy assets after a config switch.

| Detail | Value |
|--------|-------|
| **Purpose** | Produce a `cleanup_plan` diffing the active config against the manifest snapshot |
| **Args** | `-- --dry-run` (default), `-- --apply --session <id> --token <hash>`, `-- --check` |
| **Output** | JSON `cleanup_plan` on stdout (dry-run/check); file deletions (apply) |
| **Exit codes** | 0 = clean/applied, 2 = drift detected (check mode) |
| **Config fields used** | `static.framework`, `llm.strategy`, `llm.codeFramework` |
| **Schema** | Output validated against `templates/schema/cleanup-plan.schema.json` |

### `pnpm run eval:update`

Diff-aware refresh of generated eval cases (re-discovers, detects drift, optionally applies).

| Detail | Value |
|--------|-------|
| **Purpose** | Detect drift in AI primitives and update generated eval cases with user confirmation |
| **Args** | `-- [--apply] [--check] [--target <glob>] [--no-analyser]` |
| **Output** | Drift report on stdout; manifest updated on apply |
| **Exit codes** | 0 = no critical drift, 2 = critical drift (check mode) |
| **Config fields used** | `update.*`, `discoveryTargets`, `skillsRoots`, `ignore` |

### `pnpm run eval` / `pnpm run eval:full`

Orchestrate a full eval run (static + optional LLM backends).

| Detail | Value |
|--------|-------|
| **Purpose** | Run configured backends, write `static.yml` + `llm.yml` + `report.yml` per run |
| **Args** | `-- [--full] [--llm-only] [--model <id>]` |
| **Output** | Run folder at `{evalsDir}/_runs/<ts>/` |
| **Exit codes** | 0 = success |
| **Config fields used** | `evalsDir`, `static.framework`, `llm.strategy`, `llm.codeFramework`, `llm.model.id`, `runs.retention` |

### `pnpm run eval:gc`

Prune old run folders past the configured retention limit.

| Detail | Value |
|--------|-------|
| **Purpose** | List (dry-run) or delete past-retention run directories |
| **Args** | `-- [--dry-run] [--apply] [--retention <N>]` |
| **Output** | JSON plan on stdout |
| **Exit codes** | 0 = success |
| **Config fields used** | `evalsDir`, `runs.retention` |

## Invocation rules for agents

1. **Always use the `pnpm run eval:<name>` alias** — never `pnpm exec tsx scripts/<file>.ts`.
2. **Pass args after `--`** when the script needs them: `pnpm run eval:analyse -- <target-id>`.
3. **Config is loaded automatically** by the centralized loader (`loadEvalConfig`). You do NOT need to pass `--config`.
4. **Migration is automatic** — if the user's repo has a legacy `.zoto-eval-system/` directory, it is migrated transparently on first run.
5. **Error handling** — non-zero exit means the operation failed. Parse stderr for structured error JSON when available (`{ "error": "...", "code": "..." }`).
