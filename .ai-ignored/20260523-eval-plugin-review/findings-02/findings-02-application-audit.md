# Findings 02 — Eval Plugin Application Audit

## Scope and method

- Scope: state-only audit of how `zoto-eval-system` is applied to this monorepo.
- Boundaries honored: no `pnpm run eval*`, no test/CI invocations, no copy/sync from local plugin into in-monorepo plugin.
- Evidence sources: filesystem inspection of host repo + authoritative local plugin copy + targeted config/script/manifest reads.

## 1) Config snapshot (`.zoto/eval-system/config.yml`)

- File exists: **yes**. Non-comment active lines: **0** (comment-only config).
- YAML validity: parses as `null` (syntactically valid comment-only YAML document).
- Evidence: `4:6:.zoto/eval-system/config.yml` states commented defaults; `8:151:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` defines runtime defaults.

Effective defaults in force (because all keys are absent):

| Key | Effective default | Evidence |
|---|---|---|
| `evalsDir` | `evals` | `8:8:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `skillsRoots` | `[.cursor/skills, skills, plugins/*/skills]` | `9:13:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `discoveryTargets` | `[skill, command, agent, hook]` | `14:20:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `ignore` | `[]` | `73:78:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `static.framework` | `pytest` | `27:31:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `llm.runtime` | `tsx` | `39:39:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `llm.strategy` | `declarative` | `47:51:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `llm.codeFramework` | `vitest` | `53:57:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `llm.model.id` | `composer-2.5` | `40:44:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `judgeModel` | `opus-4.6` | `61:61:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `manualChecklists.enabled` | `false` | `62:66:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `additionalAutomation` | `[]` | `68:72:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `analyser.concurrency` | `4` | `84:90:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `analyser.maxCallsPerInvocation` | `50` | `91:97:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `runs.retention` | `30` | `105:110:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.criticalChangeRules.*` | all `true` | `121:126:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.preserveUserAuthoredCases` | `true` (`const`) | `128:133:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.writeMetaMarker` | `true` (`const`) | `134:139:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.manifestPath` | `.zoto/eval-system/manifest.yml` | `140:140:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.historyPath` | `.zoto/eval-system/manifest.history.yml` | `141:141:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.rediscoverWithSameDefaults` | `true` | `142:142:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.checkExitCodeOnCriticalDrift` | `2` | `143:143:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| `update.failOnNoAnalyserInCI` | `false` | `144:148:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |

## 2) Manifest state (`.zoto/eval-system/manifest*.yml`)

- `manifest.yml` present: **false**
- `manifest.history.yml` present: **false**
- Implication: current repo state does not show evidence of completed `/z-eval-create` application.

## 3) Cache state (`.zoto/eval-system/cache/`)

- Total files: **33**
- Total size: **274.47 KB**
- Oldest file: `analyser/553b9762b56587b7277eb75d70819dc1d09c66e3431b7594ed22f7cdc9c8211b.json` at `2026-05-08T21:04:48.746376`
- Newest file: `analyser/7a422feca22dc1daf68f9d94b509d6d663e0cccf4d5b4f0c6bbb79963d264368.json` at `2026-05-17T01:15:11.256672`
- Cached analyser payload kinds (from payload `kind` field):
  - `agent`: 9
  - `command`: 16
  - `hook`: 2
  - `skill`: 5

## 4) Evals tree state (`evals/`)

- `evals/llm/` present: **true**, entries: `node_modules/`.
- `evals/__pycache__/` present: **true**, entries: `conftest.cpython-312-pytest-9.0.2.pyc`, `test_example.cpython-312-pytest-9.0.2.pyc`, `test_meta_invariants.cpython-312-pytest-9.0.2.pyc`.
- `evals/_llm/` stamped runner present: **false**
- `evals/static/` tree present: **false**
- Any declarative `evals.json` under `evals/`: **false**
- Any `runner.ts` under `evals/`: **false**

## 5) Run-artefact accumulation (`evals/_runs/`)

- Run directory count: **332**
- Oldest by folder name: `2026-05-08T12-57-43-226Z`
- Newest by folder name: `20260516T133043Z`
- Oldest by mtime: `20260507-125443` at `2026-05-07T22:57:22.198933`
- Newest by mtime: `20260516-152606` at `2026-05-17T01:41:23.448508`
- Total on-disk size: **11.48 MB** (du reports ~23M)
- Comparison vs default retention (`runs.retention: 30`): **over by 302 directories**; flag as cleanup candidate only (no GC action taken in this subtask).

## 6) Host `package.json` wiring

- Root `package.json` `eval*` scripts present: **0**
  - *(none)*
- Evidence: `5:11:package.json` only includes generic build/test/validate scripts.
- Plugin expected orchestrator script surface (from template):
  - `eval`
  - `eval:compare`
  - `eval:full`
  - `eval:gc`
  - `eval:gc:apply`
  - `eval:judge`
  - `eval:list`
  - `eval:llm`
  - `eval:manual`
  - `eval:static`
  - `eval:static:jest`
  - `eval:static:pytest`
  - `eval:static:vitest`
  - `eval:update`
  - `eval:update:check`
- Evidence for expected script set: `3:17:.cursor/plugins/local/zoto-eval-system/templates/package-scripts/base.json`.

## 7) Per-plugin local eval directories (`plugins/*/skills/*/evals/`)

- Discovered directories: **4**
  - `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals` -> `evals.json`
  - `plugins/zoto-spec-system/skills/zoto-create-spec/evals` -> `evals.json`
  - `plugins/zoto-spec-system/skills/zoto-execute-spec/evals` -> `evals.json`
  - `plugins/zoto-spec-system/skills/zoto-judge-spec/evals` -> `evals.json`
- Current form check: each discovered directory contains `evals.json`, which matches the expected skill eval location contract (`.../skills/<name>/evals/evals.json`).
- Evidence for expected path contract: `22:23:.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md`.

## 8) In-monorepo vs local-copy plugin gap

- Compared:
  - In-monorepo (shipping path): `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-eval-system`
  - Local authoritative copy: `/home/andrewv/.cursor/plugins/local/zoto-eval-system`
- Local file count: **127**
- In-monorepo file count: **11**
- Common files: **1** (`templates/env/.env.example.tmpl`)
- Missing from in-monorepo: **126 files**, **14321 LOC**, **652.46 KB**
- Extra files in in-monorepo not in local copy: **10** (all under `node_modules/` / build cache)

Missing-file breakdown by top-level component:

| Component | Missing files | Missing LOC |
|---|---:|---:|
| `.cursor-plugin` | 1 | 21 |
| `CHANGELOG.md` | 1 | 62 |
| `LICENSE` | 1 | 21 |
| `README.md` | 1 | 500 |
| `agents` | 8 | 410 |
| `commands` | 13 | 852 |
| `hooks` | 3 | 301 |
| `rules` | 1 | 100 |
| `skills` | 18 | 3306 |
| `templates` | 79 | 8748 |

<details>
<summary>Full file list missing from in-monorepo plugin (126 files)</summary>

- `.cursor-plugin/plugin.json` (21 LOC)
- `CHANGELOG.md` (62 LOC)
- `LICENSE` (21 LOC)
- `README.md` (500 LOC)
- `agents/zoto-eval-adviser.md` (61 LOC)
- `agents/zoto-eval-analyser-subagent.md` (58 LOC)
- `agents/zoto-eval-comparer.md` (31 LOC)
- `agents/zoto-eval-configurer.md` (70 LOC)
- `agents/zoto-eval-executor.md` (44 LOC)
- `agents/zoto-eval-generator.md` (52 LOC)
- `agents/zoto-eval-judge.md` (36 LOC)
- `agents/zoto-eval-updater.md` (58 LOC)
- `commands/z-eval-advise.md` (112 LOC)
- `commands/z-eval-compare.md` (59 LOC)
- `commands/z-eval-configure.md` (127 LOC)
- `commands/z-eval-create.md` (68 LOC)
- `commands/z-eval-execute.md` (66 LOC)
- `commands/z-eval-help.md` (58 LOC)
- `commands/z-eval-init.md` (40 LOC)
- `commands/z-eval-judge.md` (55 LOC)
- `commands/z-eval-jump.md` (40 LOC)
- `commands/z-eval-operator.md` (40 LOC)
- `commands/z-eval-start.md` (40 LOC)
- `commands/z-eval-update.md` (84 LOC)
- `commands/z-eval-workflow.md` (63 LOC)
- `hooks/hooks.json` (13 LOC)
- `hooks/zoto-eval-session-start.mjs` (128 LOC)
- `hooks/zoto-eval-session-start.ts` (160 LOC)
- `rules/zoto-eval-system.mdc` (100 LOC)
- `skills/zoto-advise-evals/SKILL.md` (413 LOC)
- `skills/zoto-advise-evals/evals/evals.json` (71 LOC)
- `skills/zoto-compare-evals/SKILL.md` (83 LOC)
- `skills/zoto-compare-evals/evals/evals.json` (144 LOC)
- `skills/zoto-configure-evals/SKILL.md` (174 LOC)
- `skills/zoto-configure-evals/evals/evals.json` (268 LOC)
- `skills/zoto-create-evals/SKILL.md` (159 LOC)
- `skills/zoto-create-evals/evals/evals.json` (199 LOC)
- `skills/zoto-eval-tooling/SKILL.md` (109 LOC)
- `skills/zoto-eval-tooling/evals/evals.json` (191 LOC)
- `skills/zoto-execute-evals/SKILL.md` (104 LOC)
- `skills/zoto-execute-evals/evals/evals.json` (225 LOC)
- `skills/zoto-help-evals/SKILL.md` (129 LOC)
- `skills/zoto-help-evals/evals/evals.json` (335 LOC)
- `skills/zoto-judge-evals/SKILL.md` (94 LOC)
- `skills/zoto-judge-evals/evals/evals.json` (206 LOC)
- `skills/zoto-update-evals/SKILL.md` (148 LOC)
- `skills/zoto-update-evals/evals/evals.json` (254 LOC)
- `templates/agent-evals/evals.json.tmpl` (78 LOC)
- `templates/baseline-fixtures/.cursor/.gitkeep` (0 LOC)
- `templates/baseline-fixtures/.cursor/mcp.json` (3 LOC)
- `templates/baseline-fixtures/.gitignore` (3 LOC)
- `templates/baseline-fixtures/.zoto/eval-system/.gitkeep` (0 LOC)
- `templates/baseline-fixtures/.zoto/eval-system/config.yml` (92 LOC)
- `templates/baseline-fixtures/README.md` (3 LOC)
- `templates/baseline-fixtures/package.json` (4 LOC)
- `templates/canvas/compare-prompt.md.tmpl` (44 LOC)
- `templates/command-evals/evals.json.tmpl` (82 LOC)
- `templates/config.json` (45 LOC)
- `templates/hook-evals/evals.json.tmpl` (80 LOC)
- `templates/init-config.yml` (85 LOC)
- `templates/llm/agent-sdk/README.md.tmpl` (150 LOC)
- `templates/llm/agent-sdk/case.ts.tmpl` (387 LOC)
- `templates/llm/agent-sdk/compare.ts.tmpl` (97 LOC)
- `templates/llm/agent-sdk/graders/common.ts.tmpl` (7 LOC)
- `templates/llm/agent-sdk/graders/contains.ts.tmpl` (23 LOC)
- `templates/llm/agent-sdk/graders/llm-judge.ts.tmpl` (49 LOC)
- `templates/llm/agent-sdk/graders/regex.ts.tmpl` (32 LOC)
- `templates/llm/agent-sdk/graders/tool-called.ts.tmpl` (23 LOC)
- `templates/llm/agent-sdk/metrics.ts.tmpl` (71 LOC)
- `templates/llm/agent-sdk/package.deps.json` (13 LOC)
- `templates/llm/agent-sdk/runner.ts.tmpl` (394 LOC)
- `templates/llm/agent-sdk/update.ts.tmpl` (595 LOC)
- `templates/llm/agent-sdk/writer.ts.tmpl` (130 LOC)
- `templates/llm/code-cursor-sdk/README.md` (147 LOC)
- `templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` (456 LOC)
- `templates/llm/code-cursor-sdk/_shared/graders/contains.ts.tmpl` (12 LOC)
- `templates/llm/code-cursor-sdk/_shared/graders/llm-judge.ts.tmpl` (116 LOC)
- `templates/llm/code-cursor-sdk/_shared/graders/regex.ts.tmpl` (7 LOC)
- `templates/llm/code-cursor-sdk/_shared/graders/tool-called.ts.tmpl` (7 LOC)
- `templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.jest.ts.tmpl` (83 LOC)
- `templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.vitest.ts.tmpl` (83 LOC)
- `templates/llm/code-cursor-sdk/_shared/result-yaml-writer.ts.tmpl` (205 LOC)
- `templates/llm/code-cursor-sdk/_shared/sandbox-helpers.ts.tmpl` (85 LOC)
- `templates/llm/code-cursor-sdk/_shared/sdk-bridge.ts.tmpl` (61 LOC)
- `templates/llm/code-cursor-sdk/_shared/setup.ts.tmpl` (78 LOC)
- `templates/llm/code-cursor-sdk/graders/common.ts.tmpl` (17 LOC)
- `templates/llm/code-cursor-sdk/graders/contains.ts.tmpl` (29 LOC)
- `templates/llm/code-cursor-sdk/graders/llm-judge.ts.tmpl` (60 LOC)
- `templates/llm/code-cursor-sdk/graders/regex.ts.tmpl` (35 LOC)
- `templates/llm/code-cursor-sdk/graders/tool-called.ts.tmpl` (36 LOC)
- `templates/llm/code-cursor-sdk/jest.config.ts.tmpl` (59 LOC)
- `templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` (31 LOC)
- `templates/llm/code-cursor-sdk/reporters/zoto-llm-reporter.ts.tmpl` (261 LOC)
- `templates/llm/code-cursor-sdk/sandbox-helpers.ts.tmpl` (55 LOC)
- `templates/llm/code-cursor-sdk/setup.ts.tmpl` (45 LOC)
- `templates/llm/code-cursor-sdk/vitest.config.ts.tmpl` (33 LOC)
- `templates/package-scripts/base.json` (28 LOC)
- `templates/runner/eval-orchestrate.ts.tmpl` (717 LOC)
- `templates/runner/test.py.tmpl` (84 LOC)
- `templates/schema/analyser-payload.schema.json` (148 LOC)
- `templates/schema/case-meta.schema.json` (63 LOC)
- `templates/schema/cleanup-plan.schema.json` (178 LOC)
- `templates/schema/config.schema.json` (152 LOC)
- `templates/schema/manifest.schema.json` (98 LOC)
- `templates/schema/needs-user-input.schema.json` (66 LOC)
- `templates/schema/result.schema.json` (158 LOC)
- `templates/skill-evals/evals.json.tmpl` (37 LOC)
- `templates/static/_shared/result-yaml-writer.ts.tmpl` (205 LOC)
- `templates/static/jest/README.md` (127 LOC)
- `templates/static/jest/jest.config.ts.tmpl` (62 LOC)
- `templates/static/jest/package.deps.json` (12 LOC)
- `templates/static/jest/per-primitive-test.ts.tmpl` (169 LOC)
- `templates/static/jest/reporters/zoto-eval-reporter.ts.tmpl` (205 LOC)
- `templates/static/jest/setup.ts.tmpl` (53 LOC)
- `templates/static/pytest/_reporter.py.tmpl` (171 LOC)
- `templates/static/pytest/conftest.py.tmpl` (305 LOC)
- `templates/static/pytest/fixtures/.gitkeep` (1 LOC)
- `templates/static/pytest/per-primitive-test.py.tmpl` (465 LOC)
- `templates/static/pytest/requirements.txt` (3 LOC)
- `templates/static/vitest/README.md` (111 LOC)
- `templates/static/vitest/per-primitive-test.ts.tmpl` (185 LOC)
- `templates/static/vitest/reporters/zoto-eval-reporter.ts.tmpl` (178 LOC)
- `templates/static/vitest/setup.ts.tmpl` (67 LOC)
- `templates/static/vitest/vitest.config.ts.tmpl` (54 LOC)
- `templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` (133 LOC)
- `templates/user-checklists/scenario.md.tmpl` (22 LOC)

</details>

## 9) Marketplace registration

- `zoto-eval-system` present in `.cursor-plugin/marketplace.json`: **false**
- Marketplace plugin entries currently listed: **2** (`zoto-spec-system`, `zoto-cursor-top`).
- Consequence: this plugin is excluded from marketplace publish flow in current state.
- Evidence: `12:23:.cursor-plugin/marketplace.json` contains two plugin entries and no `zoto-eval-system` name.

## 10) Drift status (mental execution only, no command run)

- `zoto-update-evals` requires both config and manifest; if manifest is missing, it aborts with `"Run /z-eval-create first."`.
- Therefore, expected `pnpm run eval:update --check` behaviour in current state: immediate failure on missing manifest (not a drift classification pass).
- Evidence: `12:13:.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md`; `33:34:.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md`.

## 11) State summary table (severity-graded)

| Artefact | Present? | Current vs expected | Severity |
|---|---|---|---|
| Config snapshot | yes | `.zoto/eval-system/config.yml` exists and is fully comment-only (`0` active keys). Effective runtime behaviour is 100% defaults from schema/template. (`4:6:.zoto/eval-system/config.yml`, `8:151:.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json`) | info |
| Manifest state | no | Both `.zoto/eval-system/manifest.yml` and `.zoto/eval-system/manifest.history.yml` are absent, so `/z-eval-create` has not been applied in this repo state. Hint for subtask 09: make create/init + manifest bootstrapping a first remediation tranche. | blocker |
| Cache state | yes | `.zoto/eval-system/cache/` has 33 files (274.47 KB). Cached analyser payload kinds: agent=9, command=16, hook=2, skill=5. | warn |
| Evals tree state | partial | `evals/llm/` exists but only contains `node_modules/`; `evals/__pycache__/` contains stale `.pyc`; no `evals/_llm/`, no `evals/static/`, no `evals.json`, no `runner.ts`. Hint for subtask 09: stamp canonical eval trees and remove unowned residue. | blocker |
| Run artefact accumulation | yes | `evals/_runs/` has 332 run dirs (11.48 MB), exceeding default retention 30 by 302. Cleanup candidate only (no GC applied). Hint for subtask 09: define retention enforcement rollout. | warn |
| Host package.json wiring | no | Root `package.json` contains zero `eval*` scripts, while plugin base template expects orchestrator scripts (`eval`, `eval:full`, `eval:update`, etc.). Hint for subtask 09: add script stamping to integration checklist. | blocker |
| Per-plugin local eval dirs | yes | Found 4 `plugins/*/skills/*/evals/` directories, each with `evals.json` (matches expected skill coverage path contract). (`22:23:.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md`) | info |
| In-monorepo vs local-copy gap | no | Monorepo plugin misses 126 local files (14321 LOC, 652.46 KB). Only common file: `templates/env/.env.example.tmpl`. Hint for subtask 09: execute controlled source-of-truth sync plan before publish. | blocker |
| Marketplace registration | no | `.cursor-plugin/marketplace.json` does not list `zoto-eval-system`; plugin cannot be published through marketplace workflow. Hint for subtask 09: add marketplace entry and verify plugin source path. (`12:23:.cursor-plugin/marketplace.json`) | blocker |
| Drift check readiness | no | Given missing manifest, `/z-eval-update --check` would abort with "Run /z-eval-create first." rather than return drift status. (`12:12:.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md`) | warn |

Severity tally:

- `info`: **2**
- `warn`: **3**
- `blocker`: **5**

## 12) Audit integrity checks

- No-copy gate honored: **yes** (no content propagated from local plugin copy into `plugins/zoto-eval-system/`).
- No `eval*` scripts invoked, no tests/CI invoked, and no mutations made under `evals/`, `.zoto/`, `package.json`, or `.cursor-plugin/marketplace.json`.
