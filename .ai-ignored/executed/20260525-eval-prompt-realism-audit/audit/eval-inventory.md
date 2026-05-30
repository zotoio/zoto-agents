# Eval file inventory

Generated for **Eval Prompt Realism Audit** (subtask 01). Re-verified against on-disk JSON and `.zoto/eval-system/manifest.yml` on 2026-05-25.

## Summary

| Metric | Value |
|--------|------:|
| In-scope eval JSON files | 48 |
| Total cases | 299 |
| Generated cases (`_meta.generated === true`) | 258 |
| User-authored cases | 41 |
| Container shape `cases[]` | 30 files |
| Container shape `evals[]` | 8 files |
| Container shape `mixed` | 10 files |
| Manifest `eval_files[]` entries | 47 |
| Missing from manifest | 1 |
| Broken manifest pointers (in-scope) | 0 |

**Git cross-check:** `git ls-files | grep -E "(evals/(commands|agents|hooks)/[^/]+\.json|evals/evals\.json)"` returns 52 paths; four are out-of-scope template stubs (`plugins/zoto-eval-system/templates/*-evals/evals.json.tmpl`). In-scope count 48 matches enumeration modulo fixtures.

**eval:list cross-check:** `pnpm run eval:list` reports `total: 299` cases across manifest-listed targets (cursor-top skill omitted from manifest).

## Manifest reconciliation

### Missing from manifest (1)

| Path | Notes |
|------|-------|
| `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` | Discovered by `eval:list`; not in `manifest.yml` `eval_files[]`. Byte-preserve per Subtask 09. |

### Broken manifest pointers (0)

_None — every manifest `eval_files[]` path resolves to an on-disk file._

## Per scope bucket

### eval-system commands

**Bucket totals:** 13 files · 74 generated · 0 user-authored · 74 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-eval-system/evals/commands/z-eval-advise.json` | cases[] | command:z-eval-advise | 9 | 0 | 9 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-compare.json` | cases[] | command:z-eval-compare | 4 | 0 | 4 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-configure.json` | cases[] | command:z-eval-configure | 9 | 0 | 9 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-create.json` | cases[] | command:z-eval-create | 3 | 0 | 3 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-execute.json` | cases[] | command:z-eval-execute | 6 | 0 | 6 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-help.json` | cases[] | command:z-eval-help | 7 | 0 | 7 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-init.json` | cases[] | command:z-eval-init | 5 | 0 | 5 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-judge.json` | cases[] | command:z-eval-judge | 3 | 0 | 3 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-jump.json` | cases[] | command:z-eval-jump | 2 | 0 | 2 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-operator.json` | cases[] | command:z-eval-operator | 2 | 0 | 2 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-start.json` | cases[] | command:z-eval-start | 4 | 0 | 4 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-update.json` | cases[] | command:z-eval-update | 9 | 0 | 9 | yes |
| `plugins/zoto-eval-system/evals/commands/z-eval-workflow.json` | cases[] | command:z-eval-workflow | 11 | 0 | 11 | yes |

### eval-system agents

**Bucket totals:** 8 files · 47 generated · 0 user-authored · 47 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-eval-system/evals/agents/zoto-eval-adviser.json` | cases[] | agent:zoto-eval-adviser | 6 | 0 | 6 | yes |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` | cases[] | agent:zoto-eval-analyser-subagent | 6 | 0 | 6 | yes |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json` | cases[] | agent:zoto-eval-comparer | 3 | 0 | 3 | yes |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-configurer.json` | cases[] | agent:zoto-eval-configurer | 10 | 0 | 10 | yes |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-executor.json` | cases[] | agent:zoto-eval-executor | 4 | 0 | 4 | yes |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-generator.json` | cases[] | agent:zoto-eval-generator | 5 | 0 | 5 | yes |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-judge.json` | cases[] | agent:zoto-eval-judge | 3 | 0 | 3 | yes |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-updater.json` | cases[] | agent:zoto-eval-updater | 10 | 0 | 10 | yes |

### eval-system hooks

**Bucket totals:** 1 files · 4 generated · 0 user-authored · 4 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json` | cases[] | hook:zoto-eval-system | 4 | 0 | 4 | yes |

### eval-system skills

**Bucket totals:** 9 files · 56 generated · 23 user-authored · 79 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json` | evals[] | zoto-advise-evals | 0 | 4 | 4 | yes |
| `plugins/zoto-eval-system/skills/zoto-compare-evals/evals/evals.json` | mixed | zoto-compare-evals | 2 | 2 | 4 | yes |
| `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` | mixed | zoto-configure-evals | 7 | 2 | 9 | yes |
| `plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json` | mixed | zoto-create-evals | 5 | 3 | 8 | yes |
| `plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json` | evals[] | zoto-eval-tooling | 8 | 0 | 8 | yes |
| `plugins/zoto-eval-system/skills/zoto-execute-evals/evals/evals.json` | mixed | zoto-execute-evals | 7 | 3 | 10 | yes |
| `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json` | mixed | zoto-help-evals | 13 | 3 | 16 | yes |
| `plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json` | mixed | zoto-judge-evals | 5 | 3 | 8 | yes |
| `plugins/zoto-eval-system/skills/zoto-update-evals/evals/evals.json` | mixed | zoto-update-evals | 9 | 3 | 12 | yes |

### spec-system commands

**Bucket totals:** 4 files · 23 generated · 0 user-authored · 23 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-spec-system/evals/commands/z-spec-create.json` | cases[] | command:z-spec-create | 5 | 0 | 5 | yes |
| `plugins/zoto-spec-system/evals/commands/z-spec-execute.json` | cases[] | command:z-spec-execute | 9 | 0 | 9 | yes |
| `plugins/zoto-spec-system/evals/commands/z-spec-init.json` | cases[] | command:z-spec-init | 4 | 0 | 4 | yes |
| `plugins/zoto-spec-system/evals/commands/z-spec-judge.json` | cases[] | command:z-spec-judge | 5 | 0 | 5 | yes |

### spec-system agents

**Bucket totals:** 3 files · 19 generated · 0 user-authored · 19 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-spec-system/evals/agents/zoto-spec-executor.json` | cases[] | agent:zoto-spec-executor | 9 | 0 | 9 | yes |
| `plugins/zoto-spec-system/evals/agents/zoto-spec-generator.json` | cases[] | agent:zoto-spec-generator | 6 | 0 | 6 | yes |
| `plugins/zoto-spec-system/evals/agents/zoto-spec-judge.json` | cases[] | agent:zoto-spec-judge | 4 | 0 | 4 | yes |

### spec-system hooks

**Bucket totals:** 1 files · 2 generated · 0 user-authored · 2 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json` | cases[] | hook:zoto-spec-system | 2 | 0 | 2 | yes |

### spec-system skills

**Bucket totals:** 3 files · 19 generated · 12 user-authored · 31 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` | mixed | zoto-create-spec | 5 | 4 | 9 | yes |
| `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json` | mixed | zoto-execute-spec | 10 | 5 | 15 | yes |
| `plugins/zoto-spec-system/skills/zoto-judge-spec/evals/evals.json` | mixed | zoto-judge-spec | 4 | 3 | 7 | yes |

### cursor-top skills

**Bucket totals:** 1 files · 0 generated · 3 user-authored · 3 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` | evals[] | zoto-cursor-top-monitor | 0 | 3 | 3 | **no** |

### workspace .cursor/evals commands

**Bucket totals:** 2 files · 5 generated · 0 user-authored · 5 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `.cursor/evals/commands/sync-plugins.json` | evals[] | sync-plugins | 2 | 0 | 2 | yes |
| `.cursor/evals/commands/zoto-create-plugin.json` | evals[] | zoto-create-plugin | 3 | 0 | 3 | yes |

### workspace .cursor/evals agents

**Bucket totals:** 1 files · 6 generated · 0 user-authored · 6 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `.cursor/evals/agents/zoto-plugin-manager.json` | evals[] | — | 6 | 0 | 6 | yes |

### workspace .cursor/evals hooks

**Bucket totals:** 1 files · 3 generated · 0 user-authored · 3 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `.cursor/evals/hooks/hooks.json` | evals[] | — | 3 | 0 | 3 | yes |

### workspace .cursor/skills

**Bucket totals:** 1 files · 0 generated · 3 user-authored · 3 total cases

| Path | Shape | Target ID | Gen | User | Total | Manifest |
|------|-------|-----------|----:|-----:|------:|:--------:|
| `.cursor/skills/zoto-create-plugin/evals/evals.json` | evals[] | zoto-create-plugin | 0 | 3 | 3 | yes |

## Per-target-kind totals

Rows aggregate all in-scope files by primitive kind (command / agent / hook / skill).

| Target kind | Files | Generated | User-authored | Total |
|-------------|------:|----------:|--------------:|------:|
| command | 19 | 102 | 0 | 102 |
| agent | 12 | 72 | 0 | 72 |
| hook | 3 | 9 | 0 | 9 |
| skill | 14 | 75 | 41 | 116 |
| **All** | **48** | **258** | **41** | **299** |

## Container shape notes

- **`cases[]`**: top-level `target_id` + `cases[]` (central plugin eval JSON for commands, agents, hooks).
- **`evals[]`**: top-level `skill_name` / `command_name` + `evals[]` with uniform authorship (all generated or all user-authored).
- **`mixed`**: `evals[]` file containing both user-authored rows (no `_meta.generated`) and `_meta.generated: true` rows — typical after `zoto-update-evals` appends generated cases beside legacy user cases.
