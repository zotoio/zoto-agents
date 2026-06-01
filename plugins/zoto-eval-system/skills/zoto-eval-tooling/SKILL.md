---
name: zoto-eval-tooling
description: Invocation reference for all eval-system CLI commands. Use this skill when you need to run eval scripts — never reference script paths directly; always invoke via the package.json aliases documented here.
---

# Eval System CLI Tooling

This skill is the **single source of truth** for how agents invoke eval-system CLI commands.

**Lean hosts (default):** nested `.zoto/eval-system/package.json` exposes `pnpm run eval` and `pnpm run eval:full` (root may delegate via `pnpm -C .zoto/eval-system run eval`). Every other command is invoked via the bridge from the repo root:

```bash
tsx .zoto/eval-system/scripts/eval-bridge.ts <script-base> [-- <args>]
```

Examples: `tsx .zoto/eval-system/scripts/eval-bridge.ts eval-discover`, `tsx .zoto/eval-system/scripts/eval-bridge.ts engine/update -- --check`, `tsx .zoto/eval-system/scripts/eval-bridge.ts eval-stamp -- command:foo`.

**Ejected hosts:** root aliases delegate to `pnpm -C .zoto/eval-system <script>`; the nested package carries the full `eval:*` set.

Agents MUST NOT reference underlying TypeScript file paths in the plugin install — always go through `.zoto/eval-system/scripts/eval-bridge.ts` (lean) or root `pnpm run eval:*` (ejected).

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
| **Purpose** | Emit deterministic test files for pytest / vitest / jest backends (and, for one allowlisted skill, merge analyser rows into that skill’s `evals/evals.json`) |
| **Args** | `-- <target-id> [--dry-run] [--baseline-only]` |
| **Output** | Files written under `{evalsDir}/` for command/agent/hook targets; **`skill:zoto-eval-tooling`** stamps `plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json` from the analyser cache — stdout reports the path written |
| **Exit codes** | 0 = success, 1 = error (missing payload, bad target), 2 = non-allowlisted `skill:*` target |
| **Config fields used** | `static.framework`, `evalsDir` |
| **Note** | **`skill:zoto-eval-tooling`** is allowlisted: run `pnpm run eval:analyse -- skill:zoto-eval-tooling` first (cache under `.zoto/eval-system/cache/analyser/`), then `pnpm run eval:stamp -- skill:zoto-eval-tooling`. Every other `skill:*` refuses stamp — use `templates/skill-evals/evals.json.tmpl`. The allowlist (`CENTRAL_STAMP_SKILL_ALLOWLIST`) lives in `eval-stamp.ts`: **lean** mode resolves it from the plugin via `eval-bridge.ts` (`plugins/zoto-eval-system/scripts/eval-stamp.ts`); **ejected** mode uses the vendored copy at `.zoto/eval-system/scripts/eval-stamp.ts`. |

### `pnpm run eval:cleanup-stale`

Safe workflow before deleting generated eval assets after a **static framework** change: default mode only **plans**; destructive `--apply` is gated. The unified LLM eval harness ships a JSON-first backend shape (one co-located `<kind>/evals/<name>.json` per target), so cleanup only sweeps stale static-framework fingerprints / tests and orphaned co-located `<kind>/evals/<name>.json` files (and orphaned generated rows in central `evals.json`).

| Detail | Value |
|--------|-------|
| **Purpose** | Compute a `cleanup_plan` (manifest snapshot vs active `.zoto/eval-system/config.yml`) listing stale fingerprints, tests, and eval JSON rows eligible for removal or surgical rewrite |
| **Default (no mode flag)** | Same as `--dry-run`: prints the full **`cleanup_plan` JSON on stdout** (pretty-printed). The engine always validates the emitted document before printing. **Stderr** includes the authenticated cleanup session lines (`runId`, `plan_hash`, TTL) when a lockfile is written under `evals/_runs/` (suppress in tests with `--no-lockfile`). |
| **`-- --dry-run`** | Explicit dry-run; same stdout/stderr contract as the default. Mutually exclusive with `--apply` and `--check`. |
| **`-- --check`** | CI / pre-merge **drift gate**: recomputes and validates the plan, but does **not** print the full plan on stdout. **Exit `0`** when `cleanup_plan.totals.files === 0` (working tree matches the new config — no stale assets). **Exit `2`** when `totals.files > 0` (**drift**); stderr summarizes how many stale files / groups were found. Mutually exclusive with `--dry-run` and `--apply`. |
| **`-- --apply`** | Performs deletions / surgical rewrites from the computed plan. **Guarded:** unless `--force`, you must pass **at least one** of **`--session <runId>`** or **`--token <plan_hash>`** from the prior **`--dry-run`** stderr (lockfile under `evals/_runs/.cleanup-token-<runId>.json`). The engine verifies TTL (1 hour) and that the live `plan_hash` still matches the lockfile. **`--force`** skips that gate (non-interactive / migration only; logs a warning). **Stdout** on success is a short JSON summary (`applied`, counts, warnings), not the full `cleanup_plan`. |
| **`-- --force`** | Only meaningful with `--apply`; bypasses session/token gate. |
| **Output** | Full **`cleanup_plan` JSON on stdout** in default / `--dry-run` only; **`--check`** uses exit code + stderr; **`--apply`** prints apply summary JSON on stdout |
| **Exit codes** | **`0`** — success (dry-run printed, check found no drift, or apply completed). **`1`** — invalid mode mix, missing session/token on apply, expired/missing lockfile, plan hash mismatch vs lockfile, refused paths, or other runtime errors. **`2`** — **`--check`** detected stale files (`totals.files > 0`). **`3`** — emitted plan failed AJV validation against the cleanup-plan schema (engine/schema drift). |
| **Config fields used** | `static.framework`, `ignore` (removed-target group) |
| **Schema** | Printed and internally validated against **`plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json`** (same path as `templates/schema/cleanup-plan.schema.json` relative to the eval-system plugin). This is the schema `/z-eval-configure` and the configurer skill use for `cleanup_plan`. |

### `pnpm run eval:update`

Diff-aware refresh of generated eval cases (re-discovers, detects drift, optionally applies).

| Detail | Value |
|--------|-------|
| **Purpose** | Detect drift in AI primitives and update generated eval cases with user confirmation |
| **Args** | `-- [--apply] [--check] [--target <glob>] [--no-analyser] [--with-analyser]` (CI defaults to `--no-analyser` semantics unless `--with-analyser`) |
| **Output** | Drift report on stdout; manifest updated on apply |
| **Exit codes** | 0 = success (clean check), 2 = critical drift (check), 5 = `update.failOnNoAnalyserInCI` forbids CI cached-analysis mode |
| **Config fields used** | `update.*`, `discoveryTargets`, `skillsRoots`, `ignore` |

### `pnpm run eval` / `pnpm run eval:full`

Orchestrate a full eval run (static + optional LLM backends).

| Detail | Value |
|--------|-------|
| **Purpose** | Run configured backends, write `static.yml` + `llm.yml` + `report.yml` per run |
| **Args** | `-- [--full] [--llm-only] [--model <id>]` |
| **Output** | Run folder at `{evalsDir}/_runs/<ts>/` |
| **Exit codes** | 0 = success |
| **Config fields used** | `evalsDir`, `static.framework`, `llm.model.id`, `runs.retention` |

### `pnpm run eval:gc`

Prune old run folders past the configured retention limit.

| Detail | Value |
|--------|-------|
| **Purpose** | List (dry-run) or delete past-retention run directories |
| **Args** | `-- [--dry-run] [--apply] [--retention <N>]` |
| **Output** | JSON plan on stdout |
| **Exit codes** | 0 = success |
| **Config fields used** | `evalsDir`, `runs.retention` |

### `pnpm run eval:stamp-host-layout`

Opt-in **eject** — copy self-contained runtime into `.zoto/eval-system/`.

| Detail | Value |
|--------|-------|
| **Purpose** | Vendor `src/`, `templates/`, `engine/`, `scripts/` under `.zoto/eval-system/`, write nested `package.json`, stamp eval primitives to `.cursor/*/eval-sys/`, set `hostLayout: ejected` |
| **When** | Offline/air-gapped hosts, heavy engine customisation, CI without plugin access — **not** part of `/z-eval-create` |
| **Args** | `-- [--dry-run]` |
| **Output** | Summary on stdout listing copied dirs and config patch |
| **Exit codes** | 0 = success, 1 = error |
| **Config fields used** | Patches `hostLayout` to `ejected` |
| **Note** | In lean mode, this alias invokes `plugins/zoto-eval-system/scripts/stamp-host-layout.ts` directly (not via `eval-bridge.ts`). After eject, other `eval:*` aliases run scripts inside `.zoto/eval-system/`. |

### `pnpm run eval:un-eject`

Reverse eject — restore **lean** plugin-dependent layout.

| Detail | Value |
|--------|-------|
| **Purpose** | Remove vendored runtime, strip ejected primitives from `.cursor/`, set `hostLayout: plugin`, re-merge root eval aliases |
| **When** | Returning to lean after a prior eject; external repos migrating off full-stamp create |
| **Args** | `-- [--dry-run] [--force]` |
| **Preserves** | `config.yml`, `manifest.yml`, eval cases, `{evalsDir}/_runs/` |
| **Exit codes** | 0 = success, 1 = error or user cancelled |
| **Note** | Requires resolvable plugin (or `ZOTO_EVAL_PLUGIN_ROOT`) before subsequent lean-mode eval runs. Run `pnpm install` after un-eject. |

## Host layout modes

| Mode | `hostLayout` | Script resolution |
|------|--------------|-------------------|
| **Lean (default)** | `plugin` | `pnpm -C .zoto/eval-system run eval` / `eval:full` (or root delegates); other commands → `tsx .zoto/eval-system/scripts/eval-bridge.ts <script-base>` |
| **Ejected (opt-in)** | `ejected` | Root aliases → `.zoto/eval-system/scripts/<name>.ts` (nested package) |

Agents MUST use `pnpm run eval:*` aliases — never hard-code paths that assume one mode.

## Invocation rules for agents

1. **Lean mode:** use `pnpm -C .zoto/eval-system run eval` / `eval:full` (or root `pnpm run eval` when delegated) for orchestrated runs; use `tsx .zoto/eval-system/scripts/eval-bridge.ts <script-base> [-- args]` for everything else — never `pnpm exec tsx` paths under the plugin install.
2. **Ejected mode:** use root `pnpm run eval:*` aliases (they delegate to `.zoto/eval-system/`).
3. **Pass args after `--`** when the script needs them: `tsx .zoto/eval-system/scripts/eval-bridge.ts eval-analyse -- command:foo`.
4. **Config is loaded automatically** by the centralized loader (`loadEvalConfig`). You do NOT need to pass `--config`.
5. **Layout modes** — lean (`hostLayout: plugin`) resolves scripts via `.zoto/eval-system/scripts/eval-bridge.ts`; ejected (`hostLayout: ejected`) runs vendored scripts under `.zoto/eval-system/`. Eject/un-eject are CLI-only (`tsx .zoto/eval-system/scripts/eval-bridge.ts stamp-host-layout` / `eval-un-eject` in lean mode).
6. **Migration is automatic** — if the user's repo has a legacy `.zoto-eval-system/` directory, it is migrated transparently on first run.
7. **Error handling** — non-zero exit means the operation failed. Parse stderr for structured error JSON when available (`{ "error": "...", "code": "..." }`).
