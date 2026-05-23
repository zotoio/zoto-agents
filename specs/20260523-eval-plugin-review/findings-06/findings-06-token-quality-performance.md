# Findings 06 — LLM Token-Usage & Quality-Reliability Performance Review

- Subtask: `06 — Token Usage & Quality Reliability Performance Review`
- Agent: `zoto-eval-architect`
- Plugin source: `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`
- Prerequisite reads (sampled, not re-derived): subtask 01 inventory + subtask 02 application audit.
- Scope: static-analysis review only. No LLM invocations, no eval runs, no analyser execution.

---

## TL;DR — Verdicts

1. **Cost concentration is in the analyser path, not the judge.** Every plugin subagent — including the analyser — pins `model: claude-opus-4-6` in its frontmatter (`3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` and 7 sibling agents). The README's documented `--model > ZOTO_EVAL_MODEL > config.llm.model.id > composer-2` precedence (`174:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md`) governs only the **per-case declarative runner's** `Agent.create()` model — it does not override subagent frontmatter. Operators believing `llm.model.id: composer-2` is cheap are still paying opus rates on every analyser/updater/judge/configurer/etc. call.
2. **Judge default of `opus-4.6` is sane *for the judge*, but is duplicated across 7 non-judging subagents that don't need opus-level reasoning.** Keep `judgeModel: opus-4.6`; **remove or downgrade the `model:` line on every non-judge subagent**, or let it fall through to the configured `llm.model.id`. This is the single highest-leverage cost lever in the plugin.
3. **Declarative runner ships with a stub judge and empty graders** (`192:198:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` + `37:37:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/agent-evals/evals.json.tmpl`). Every declarative case currently emits `"graders": []`, the runner's `for (const g of c.graders ?? [])` loop is a no-op, `reports` stays empty, and `failed = reports.some(r => r.verdict === "fail") === false` — i.e. **every generated declarative case passes by construction**. This is a blocker-grade quality reliability finding orthogonal to cost.

---

## Findings Ledger

| # | Finding | Severity | Confidence | Effort | Owner |
|---|---|---|---|---|---|
| F1 | All non-judge subagents pin `claude-opus-4-6`; model precedence chain doesn't apply to subagent frontmatter | **blocker** | high | S | `zoto-eval-engineer` |
| F2 | Declarative runner's stamped cases ship with empty `graders: []`; runner passes everything | **blocker** | high | M | `zoto-eval-engineer` |
| F3 | Declarative runner's `llmJudge` is invoked with a stub `judge` fn returning `score: 0.5` | **blocker** | high | M | `zoto-eval-engineer` |
| F4 | Declarative runner is sequential across cases; no concurrency cap honoured | major | high | S | `zoto-eval-engineer` |
| F5 | Analyser system prompt is large (~2.4k tokens) AND duplicated in every per-primitive call (no shared system prompt across batch) | major | medium | M | `zoto-eval-engineer` |
| F6 | Cache scope covers only the analyser path; judge + per-case runner pay full LLM cost on every invocation | major | high | L | `zoto-eval-engineer` |
| F7 | `maxCallsPerInvocation: 50` ceiling silently counts only fresh calls; cache hits & replay hits don't count → fine for this repo, fragile for monorepos with >50 uncached primitives | minor | high | S | `zoto-eval-architect` |
| F8 | Code-strategy harness doubles LLM cost per case (1 prompt call + 1 rubric judge call) but is the only path with real assertion grading | minor | high | n/a | (design trade-off) |
| F9 | `llmJudge` pass threshold `0.72` is hard-coded; not configurable per-case or via config.yml | minor | high | S | `zoto-eval-engineer` |
| F10 | No retry strategy on transient LLM failures in either runner path; one network blip kills a multi-case run | minor | high | M | `zoto-eval-engineer` |
| F11 | Verbosity/accuracy/confidence soft-metric thresholds in judge agent (`27:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md`) — `verbosity > 2`, `confidence < 0.4`, `accuracy < 0.5` — are arbitrary; no calibration evidence | minor | medium | M | `zoto-eval-architect` |
| F12 | Cache hit rate in steady state for the host repo (this monorepo) is undermined by 332 stale run dirs (no manifest) — `/z-eval-create` cold start with no manifest will analyse all primitives even though `cache/analyser/` already has 32 payloads | major | high | M | `zoto-eval-engineer` |
| F13 | Schema validation strictness: `analyser-payload.schema.json` is enforced by the analyser caller; `result.schema.json` is enforced by orchestrator (`238:253:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/runner/eval-orchestrate.ts.tmpl`); but `llm-judge` grader output (raw `{score, detail}` JSON) is not schema-validated — malformed judge JSON silently fails the case | minor | medium | S | `zoto-eval-engineer` |
| F14 | README's documented model precedence (`174:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md`) is misleading: it omits the dominant cost driver (subagent frontmatter pinning) | info | high | S | `zoto-plugin-manager` |
| F15 | `eval:judge` package script (`12:12:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/package-scripts/base.json`) maps to `runner.ts --judge-only`, which is a smoke test (just parses YAML — `271:280:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`). The "real" judge runs as a subagent flow via `/z-eval-judge`. This is documented (line 276 says "full llm-judge replay not implemented") but the script alias is misleading. | minor | high | S | `zoto-plugin-manager` |

Legend: blocker = ship-stopper / silently false claims; major = costly or quality-degrading default; minor = optimisation or polish; info = doc clarity.

---

## 1. Per-Path Token-Cost Map

The plugin makes LLM calls in four distinct paths. The cost map below sources every number from a cited code line or an explicit assumption.

### Path 1 — Analyser

| Dimension | Value | Citation / Assumption |
|---|---|---|
| Trigger | `pnpm run eval:analyse -- <target-id>` invoked by `/z-eval-create` (Step 4a) and `/z-eval-update` (apply mode, default refresh) | `67:69:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-create-evals/SKILL.md`; `79:79:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md` |
| Concurrency cap | 4 (per `analyser.concurrency`) | `83:90:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| Per-invocation hard ceiling | 50 fresh calls (cache hits + replay hits don't count) | `91:96:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| Model | `claude-opus-4-6` (subagent frontmatter pin — overrides `llm.model.id`) | `3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` |
| Prompt template location | `agents/zoto-eval-analyser-subagent.md` (system) + analyser-payload schema reminder (envelope) + primitive source body | `1:58:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` |
| System prompt size | 8 310 bytes → ~2.4k tokens (3.5 chars/tok) | `wc -c agents/zoto-eval-analyser-subagent.md` |
| Schema reminder size | analyser-payload.schema.json subset, ~9k bytes → ~2.5k tokens (full schema is rarely fully reproduced inline; assume half is summarised → ~1.2k tokens) | `8996 bytes config.schema.json full file; assumption: schema reminder ≈ 1.2k tokens` |
| Primitive source size | Avg ~150 LOC × 80 chars/line × 1 token / 3.5 chars ≈ **3.5k tokens** | Assumption from sampled agent/command source bodies (range 60–300 LOC) |
| Total prompt tokens / call | ~2.4k (system) + ~1.2k (schema) + ~3.5k (primitive) ≈ **~7k tokens** | Sum above |
| Response tokens / call | AnalyserPayload with 2-4 cases × ~500 tokens/case + summary ≈ **~2-3k tokens** | Assumption from `analyser-payload.schema.json` structure (`6:17:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json`) |
| Per-call total | ~7k prompt + ~2.5k response ≈ **~9.5k tokens / primitive** | Sum above |
| Cache hit semantics | `.zoto/eval-system/cache/analyser/<source_hash>.json` — invalidated only on `source_hash` change; framework / strategy switches do **not** auto-invalidate (configurer stamps `_meta.primitive_analysis.invalidate=true` instead, but cache files remain on disk) | `80:80:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md` |

### Path 2 — Declarative LLM Run (`evals/_llm/runner.ts`)

| Dimension | Value | Citation / Assumption |
|---|---|---|
| Trigger | `pnpm run eval:llm` → `eval-orchestrate.ts --llm-only` → `eval:llm:declarative` (when `llm.strategy: declarative`) | `9:9:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/package-scripts/base.json`; `523:530:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/runner/eval-orchestrate.ts.tmpl` |
| Parallelism | **Sequential** — `for (const c of allCases) { const out = await runCase(c, agent, model); }` | `360:363:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |
| Model | `--model > ZOTO_EVAL_MODEL > config.llm.model.id > "composer-2"` (real precedence chain — applies here because `Agent.create({model: {id: model}})` reads runtime config) | `103:109:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |
| Per-case prompt size | Just `c.prompt` string (no few-shot, no system prompt prepended by the runner — system prompt comes from the model itself via Agent.create) → **~200-1000 tokens** | `159:159:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` (`agent.send(c.prompt)`) |
| Per-case response size | Free-form text; assume average 2k tokens for a "real" Cursor reply | Assumption |
| Per-case grader cost | **0 additional LLM calls** in current implementation — `llmJudge` is invoked with a stub `judge` fn returning `{score: 0.5}` (line 195) | `192:198:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |
| Per-case total | ~500 prompt + ~2k response = **~2.5k tokens / case** | Sum above |
| Two-gate startup | `--full` + `CURSOR_API_KEY` required, otherwise no-op exit 0 | `298:317:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |
| Cache | **None.** Every run re-sends every prompt. | (No cache code path in runner.ts.tmpl) |

### Path 3 — Code-Strategy LLM Run (Vitest/Jest harness)

| Dimension | Value | Citation / Assumption |
|---|---|---|
| Trigger | `pnpm run eval:llm:code` (when `llm.strategy: code`) — per-primitive `*.test.ts` files import `defineLlmCodeEval` | `15:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` |
| Parallelism | Vitest/Jest's default test concurrency (typically `--maxWorkers` cores). Each `it(...)` is one case. | `21:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` |
| Model | `process.env.ZOTO_EVAL_MODEL ?? "{{MODEL_ID}}"` (stamped from analyser payload at create-time, env var overrides at runtime) | `24:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`; `173:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` |
| Per-case LLM calls | **2** — 1 for the primary agent run, 1 for the `llmJudge` rubric grader | `242:268:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` + `297:308` |
| Per-case prompt size | Primary: just `c.prompt` (~500-1000 tokens). Judge: rubric = list of N analyser-emitted assertions × ~30 tokens each + response (~2k tokens) → **~3-4k tokens prompt** | `290:309:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` |
| Per-case response | Primary: ~2k tokens. Judge: JSON `{score, detail}` → ~200 tokens. | Assumption |
| Per-case total | (~1k + ~2k) primary + (~4k + ~200) judge = **~7.2k tokens / case** (2.9× the declarative path's per-case cost) | Sum above |
| Sandbox copy | Filesystem overhead only — no LLM cost. Each case prepares a fresh tmp sandbox. | `215:228:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` |
| Cache | **None per case.** Sandbox is torn down per case. | (No cache code path) |

### Path 4 — Judge (`/z-eval-judge`)

| Dimension | Value | Citation / Assumption |
|---|---|---|
| Trigger | `/z-eval-judge` slash command → `zoto-eval-judge` subagent | `1:36:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` |
| Frequency | Per-run, after `eval:llm` completes (subagent reads artefacts, writes `judge:` block to `llm.yml`) | `4:4:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` |
| Model | `judgeModel` from config (default `opus-4.6`) | `61:61:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json`; `36:36:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` |
| Subagent frontmatter pin | `claude-opus-4-6` (matches `judgeModel`'s intent) | `3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` |
| Inputs (read) | `static.yml`, `llm.yml`, `report.yml`, every `logs/<case>.log` in the latest `_runs/<ts>/` dir | `9:11:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` |
| Prompt size | Whole-run YAML + per-case logs — for the host repo's *current* state with no manifest, this is N/A; for a 20-case run with 2KB logs each, that's **~40k input tokens + ~5KB YAML rollup = ~45k tokens** | Assumption from log sizes typical of a `4000-char-truncated response` (line 255) |
| Response size | `judge:` block — findings + recommendations, typically 2-4 findings × ~100 tokens = **~500 tokens** | Assumption from `25:29:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` |
| Per-invocation total | ~45k prompt + ~500 response ≈ **~45k tokens / run** | Sum above |
| Cache | **None.** Re-runs against the latest run dir each time. | (No cache code path) |
| `eval:judge` package script | **Misleading** — `pnpm run eval:judge` runs `runner.ts --judge-only`, a smoke test that only parses `llm.yml` (line 271-280). The real LLM judge runs via `/z-eval-judge` subagent flow. | `12:12:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/package-scripts/base.json`; `271:280:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |

---

## 2. Model-Selection Sanity

### Top-3 finding (per subtask DoD): judge default

**Verdict: keep `judgeModel: opus-4.6` as the default; do not weaken it.**

Rationale:

- The judge is called **once per run**, not per case (`9:14:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md`). Run rate ≈ 1-5 / day in steady-state dev, ~10-50 / day in CI.
- Per-invocation cost ≈ 45k tokens (above) → at opus-4.6 rates (~$15 input / $75 output per 1M), that's roughly **~$0.70/run** for input + ~$0.04/run for output ≈ **~$0.75 per judge call**. A team running judges 10×/day spends ~$7.50/day — negligible vs the analyser path's per-create cost.
- The judge's job is **adversarial soft-metric annotation**: spotting weak graders, low confidence, verbosity spikes. This is exactly the kind of reasoning where opus's calibration edge matters most.
- Downgrading to `composer-2` would make the judge stand-in-line with the very models it's grading. That kills the "independent quality gate" framing.

**However**: the judge default isn't where the cost lives. The real lever is F1 — see below.

### F1 (BLOCKER) — non-judge subagents pin opus

All 8 plugin subagents pin `model: claude-opus-4-6`:

```
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-updater.md
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-adviser.md
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-comparer.md
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-executor.md
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-generator.md
3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-configurer.md
```

Of these:
- **`zoto-eval-judge`**: opus is correct (see above).
- **`zoto-eval-analyser-subagent`**: opus may be defensible for structured-JSON quality, but the configured `llm.model.id` should win. README precedence (`174:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md`) implies `composer-2` is the default — actual default is opus.
- **`zoto-eval-updater`, `zoto-eval-adviser`, `zoto-eval-comparer`, `zoto-eval-executor`, `zoto-eval-generator`, `zoto-eval-configurer`**: these are **orchestration subagents**. They mostly read artefacts, decide branching, surface `needs_user_input`. None need opus-level reasoning. Sonnet or composer-2 would handle every documented branch.

**Recommendation**: remove the `model:` line from the 6 orchestration subagents and from the analyser, letting the host's runtime model selection win. Keep `model: claude-opus-4-6` only on `zoto-eval-judge` (and surface it as `judgeModel`'s sink, not a frontmatter pin).

**Quality impact analysis**: orchestration subagents mostly do schema-aware branching and structured output — sonnet/composer-2 are competitive on both. The risk is that the analyser's strict-JSON output quality degrades on lighter models, leading to schema rejections (which the analyser caller already handles by failing the run — `9:9:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md`). Mitigation: keep the per-call structured-output retry budget (currently 1, see F10 below) — bump to 2 if migrating to a smaller model.

**Estimated cost reduction**: assuming opus-4.6 is ~5× composer-2's per-token cost, dropping 6/8 subagents from opus to composer-2 saves **~70-80% of the per-invocation orchestration cost** when those subagents run. For a `/z-eval-update --apply` cycle, that's 1 analyser call per drifted target + 1 updater orchestration call → migrating just the updater saves ~25% per `/z-eval-update`.

---

## 3. Cache Effectiveness

### Cache layout

`.zoto/eval-system/cache/analyser/<source_hash>.json` (one JSON per analysed primitive). Documented at `80:80:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md`.

### Invalidation triggers

| Trigger | Effect on cache file | Effect on `_meta.primitive_analysis.invalidate` flag |
|---|---|---|
| Primitive source body edit (changes `source_hash`) | New `<new_hash>.json` written; old file remains (no GC) | n/a |
| Framework switch (`static.framework` flip) | **No file deletion** | Configurer stamps `invalidate=true` on every cached payload (`zoto-configure-evals` SKILL) |
| Strategy switch (`llm.strategy` flip) | **No file deletion** | Same as above |
| Manifest snapshot mismatch | **No cache effect** | n/a — manifest drives drift detection, not cache invalidation |
| `--with-analyser` flag | Cache file overwritten by fresh analyser call | New file written |
| `--no-analyser` / `CI=true` without `--with-analyser` | Cache reused; stderr warning emitted | Stale `invalidate=true` is **honoured** by the updater (skill says "load the cached payload" — but no code path checks `invalidate` before reuse) |

### Steady-state hit rate (host repo: this monorepo)

From subtask 02: `cache/analyser/` currently holds 32 payloads (agent=9, command=16, hook=2, skill=5). Total primitives in repo: 37 (12 skills + 13 commands + 9 agents + 3 hooks) per Section §7 below. Estimated cache hit ratio on **next** `/z-eval-update --check` (assuming no source edits since the cache was populated):

- 32 cached / 37 covered = ~86% hit rate.
- BUT the manifest is missing (subtask 02 confirms `manifest.yml: false`, `manifest.history.yml: false`). `/z-eval-update --check` aborts before consulting the cache because it `console.error("Run /z-eval-create first.")` (`484:485:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl`).
- So in practice the cache currently contributes 0 hits because no command can reach it without a manifest.

### Cost of cache miss vs hit

| | Cost |
|---|---|
| Hit | ~0 LLM tokens (file read + JSON parse) |
| Miss | ~9.5k tokens per primitive (Path 1 above) → ~$0.16 per opus-4.6 miss |

### Cache scope

**Analyser-only.** The judge, declarative runner, and code-strategy runner each have no per-invocation cache. F6 above expands on this.

---

## 4. Prompt-Size Hot-Spots

| Path | Hot-spot | Size | Trim recommendation | Quality impact |
|---|---|---|---|---|
| Analyser | System prompt: `zoto-eval-analyser-subagent.md` body (lines 7-58) | 8 310 bytes / ~2.4k tokens | **Move the "Tailor by `kind`" table + "Realism checklist" + "Target-specific shaping" section into the per-call envelope** so each call gets only the rows relevant to its kind (~300-600 tokens vs 2.4k). | LOW — current prompt already says "We send ONE primitive at a time"; per-kind shaping is only relevant when that kind is being processed. |
| Analyser | Schema reminder envelope (caller-built from `analyser-payload.schema.json`) | ~1.2k-2.5k tokens (depends on whether schema is summarised vs reproduced) | **Replace inline JSON schema with a 5-line summary of required fields** — the analyser caller already validates AJV-style; the model doesn't need the full draft-07 schema dump. | LOW — analyser sees the schema as a contract reminder, not a learning aid. |
| Code-strategy harness | Per-case rubric: ALL `assertions[]` concatenated into one prompt (`290:296:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl`) | Up to ~2-3k tokens for cases with many assertions | **Cap rubric to first N assertions** or **split into N separate judge calls** (parallel) and combine — trade-off between cost and grading precision. | MEDIUM — if the rubric is truncated and assertion N+1 is the contract-defining one, you grade something less than the whole spec. |
| Judge | Per-case logs concatenated into prompt | Up to ~40k tokens / run | **Pre-summarise each log** (deterministic — last 200 lines, or "error sections only") before the judge LLM call; OR move log triage to a separate cheap-model preprocessing pass and feed only triaged extracts to opus. | LOW-MEDIUM — log truncation already happens at the runner level (`254:255:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` truncates at 4000 chars). Risk: missing late-stage failures. |

---

## 5. Redundant LLM Calls

| Path | Redundancy | Suggested elimination | Quality impact |
|---|---|---|---|
| Analyser | If `framework`/`strategy` switch flips `invalidate=true` on all cached payloads but the **primitive source hasn't changed**, the analyser is re-invoked even though the only payload field that changes is the stamping target (which the stamper handles deterministically) | Separate "analyser refresh" (LLM, requires source hash change) from "stamping refresh" (deterministic, never requires LLM) — the `invalidate` flag is overloaded. | NONE — current behaviour already trusts cached payloads in `--no-analyser` mode; making it the default for framework/strategy switches is consistent. |
| Code-strategy harness | Every case pays an `llmJudge` call EVEN when assertions are trivially `regex`-checkable (e.g. "the response contains the word 'manifest'") | Have the analyser categorise each assertion as `regex-checkable` vs `semantic` and emit graders accordingly. Cheap-LLM caller can build the typed grader list once per primitive (cached); runtime grading then uses the cheap path for `regex` and reserves `llmJudge` for genuinely semantic assertions. | POSITIVE — `regex` graders are deterministic & free, so quality improves on the assertions that ARE regex-checkable (no `llmJudge` floor of 0.72 to clear). For genuinely semantic assertions, the judge is still required. |
| Declarative runner | Every run sends every prompt — no per-prompt response caching | Optional `--cache-responses` mode that hashes `(model_id, prompt)` and reuses prior responses for development loops. Not for CI. | NEUTRAL — caching responses defeats the point of CI's purpose, but in local dev it saves repeated invocations of the same case. |
| Judge | Re-reads `static.yml` + `llm.yml` + `report.yml` every invocation, even when nothing changed since last judge | Hash the artefact tuple; skip if the same triple was already judged | NONE — judge is post-hoc, doesn't write new findings unless artefacts changed. |

---

## 6. Quality-Reliability Levers

### Schema validation strictness

| Output | Schema-validated? | Failure mode | Citation |
|---|---|---|---|
| `AnalyserPayload` (analyser response) | YES — `additionalProperties: false`, `JSON.parse(extractJsonObject(response))` then AJV | Rejection → run fails | `1:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` (line 9 — "the caller fails the run") |
| `report.yml` / `static.yml` / `llm.yml` | YES — `result.schema.json` AJV | Run exits with code 3 | `238:253:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/runner/eval-orchestrate.ts.tmpl` |
| `llm-judge` grader response (`{score, detail}`) | **NO** — parsed inline, no schema | Malformed → case silently fails or warns | `34:48:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/graders/llm-judge.ts.tmpl` (catch block returns `verdict: "warn"`) |
| `needs_user_input` payloads | YES — `needs-user-input.schema.json` (cited in `175:175:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md`) | Reject → command displays generic error | (Schema file in `templates/schema/`) |

**Gap**: `llm-judge` grader output is the highest-stakes parsed-JSON in the runtime path (it decides pass/fail per case) and it's not schema-validated. F13.

### Grader rigour

The **plugin's own evals.json files do NOT use the `graders` field at all.** Across `/home/andrewv/.cursor/plugins/local/zoto-eval-system/{skills,commands,agents}/**/evals.json`, the only occurrence of `"graders"` is **`"graders": []`** in templates:

- `37:37:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/agent-evals/evals.json.tmpl`
- `67:67:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/agent-evals/evals.json.tmpl`
- `templates/command-evals/evals.json.tmpl` (2 occurrences per grep count)
- `templates/hook-evals/evals.json.tmpl` (2 occurrences per grep count)

That means:
- `contains` grader usage in plugin-shipped cases: **0**
- `regex` grader usage: **0**
- `tool-called` grader usage: **0**
- `llm-judge` grader usage: **0**

The grader-rigour rule in the README ("regex over contains") is **vacuously satisfied** because no graders are populated anywhere. The runner.ts.tmpl's grader dispatch (`187:198:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`) is dead code at the moment.

**This is F2 + F3**. The implication is severe: **every shipped declarative case passes by construction**, because `for (const g of c.graders ?? [])` over `[]` produces zero reports, `reports.some(r => r.verdict === "fail")` is `false`, and the runner emits `status: "passed"` for every case.

The **code-strategy** path is materially different: it doesn't use `case.graders[]` at all — it rolls `case.assertions[]` into a single `llmJudge` rubric (`290:309:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl`). So code-strategy has **real grading** at runtime, while declarative has **stubbed grading**.

### Confidence / accuracy / verbosity thresholds

| Metric | Threshold | Citation | Calibration evidence |
|---|---|---|---|
| `verbosity > 2` flag | hard-coded | `27:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` | None — arbitrary |
| `confidence < 0.4` flag | hard-coded | same line | None |
| `accuracy < 0.5` flag | hard-coded | same line | None |
| Duration outliers `> 2σ` | hard-coded | same line | Statistically sound formulation |
| `llmJudge` `passThreshold` | `0.6` default, `0.72` in code-strategy harness | `22:22:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/graders/llm-judge.ts.tmpl`; `302:302:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` | Inconsistent across templates — pick one and document the rationale (F9) |

### Retry strategy

**None.** Neither runner has a retry around `agent.send()` / `agent.create()`. A single transient 429 / network blip:
- Declarative: bubbles up as `runtime` grader fail per case, case marked `status: "errored"` (`164:184:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`)
- Code-strategy: bubbles up as `code-cursor-sdk` grader fail per case, case marked `status: "errored"` (`269:277:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl`)

F10: add 1-2 retries with exponential backoff (5s, 30s) bounded by `caseTimeoutMs`. Quality impact: **POSITIVE** — converts transient infra noise from false failures into clean retries. Cost impact: **LOW** — only fires on errors, which should be rare. Risk: amplifies a real outage's cost; mitigate with a circuit breaker after N consecutive failures.

---

## 7. Application-Context Costs (Host Repo: zoto-agents)

From subtask 02 + a fresh primitive count for this repo:

| | Count |
|---|---|
| Skills (`.cursor/skills` + `plugins/*/skills`) | 12 (3 in plugins, 9 in `.cursor/skills`) |
| Commands (`.cursor/commands` + `plugins/*/commands`) | 13 (4 in plugins, 9 in `.cursor/commands`) |
| Agents (`.cursor/agents` + `plugins/*/agents`) | 9 (4 in plugins, 5 in `.cursor/agents`) |
| Hooks | 3 |
| **Total covered primitives** | **37** |

Cold-start `/z-eval-create` cost in this repo:

- Skills mostly use template-merge workflow (no analyser call) — except `skill:zoto-eval-tooling` (allowlisted) which DOES analyse. So analyser is invoked for:
  - 13 commands + 9 agents + 3 hooks + 1 allowlisted skill = **26 primitives**.
- BUT subtask 02 reports the cache already holds 32 payloads (agent=9, command=16, hook=2, skill=5) — those overcount relative to what's currently in the tree (probably remnants from prior plugins / iterations). Conservative assumption: ~70% of 26 = ~18 primitives hit cache; 8 are fresh misses on first cold-start.
- 8 misses × ~9.5k tokens / call ≈ **76k tokens** at opus-4.6 rates (~$15/$75 per 1M) ≈ **~$1.20 in input + $0.45 in output ≈ ~$1.65** for the analyser phase.
- If `maxCallsPerInvocation: 50` ceiling is hit (not here, but in larger ecosystems), the script aborts with a hint to use `--target` for scoping — not a graceful degradation.
- Wall time: 8 calls × 30-60s per opus call ÷ concurrency 4 = ~1-2 min wall-clock.
- Wall time for a true cold-start (cache wiped): 26 calls × 45s ÷ 4 = **~5 minutes wall-clock**, **~$5 in opus tokens**.

**User surprise risk**: high. The plugin's README does not advertise a per-primitive opus cost. A user running `/z-eval-create` for the first time on a 50-primitive repo could see a ~$10 LLM bill and a 10-minute wait. F1's recommendation (drop opus from non-judge subagents) directly mitigates this: with composer-2 as the analyser model, the same cold-start drops to **~$0.30 / ~3-minute wall-clock**.

**Secondary cost**: the 332 stale run dirs aren't an LLM cost — they're filesystem clutter, eligible for `eval:gc:apply` (subtask 02 flagged retention=30 vs 332 dirs). No bearing on token cost.

---

## 8. Top 5 Token-Reduction Wins (Ranked)

| Rank | Win | Est. token cut | Effort | Quality impact |
|---|---|---|---|---|
| 1 | **Remove `model: claude-opus-4-6` from non-judge subagents** (F1) — fall through to `llm.model.id` → `composer-2` default | ~70-80% per non-judge subagent call → ~50-65% total across all eval-system LLM cost | S — single-line edit per file × 7 files | LOW — orchestration subagents don't need opus reasoning; analyser quality risk is real but mitigable with retry budget |
| 2 | **Pre-summarise per-case logs before judge LLM call** (Section §4 row 4) — deterministic truncation/triage of logs before opus sees them | ~50-70% of judge input tokens / run | M — add a small "log-triage" deterministic step in `zoto-judge-evals` skill | LOW — judge already reads truncated logs; the risk is missing late-stage trace info, which can be mitigated by always including the last 500 lines verbatim |
| 3 | **Categorise analyser-emitted assertions as `regex` vs `semantic` and emit typed graders** (Section §5 row 2) — reroute regex-checkable assertions away from the per-case `llmJudge` rubric | ~30-50% of code-strategy per-case cost on assertions that are regex-checkable | L — analyser prompt changes + grader emission + runtime dispatch | POSITIVE — regex graders are deterministic; reserves opus judging for genuinely semantic checks |
| 4 | **Trim the analyser system prompt — move "Tailor by kind" tables into the per-call envelope** so only the relevant kind's row is included | ~30-40% of analyser system-prompt tokens (~700-1000 tokens / call × 26 cold-start calls = ~25k tokens) | S — split the markdown file + adjust caller envelope | LOW — current prompt sends all kinds' rows to every call regardless of `kind` |
| 5 | **Make framework/strategy switches NOT invalidate analyser cache** (Section §5 row 1) — `invalidate` flag is for stamping, not analyser refresh | Saves 100% of analyser tokens on framework/strategy flips (currently re-analyses everything) | S — gate `runAnalyser` on source_hash change only | NONE — cached payload is a function of source content, not framework/strategy |

---

## 9. Top 5 Quality-Reliability Wins (Ranked)

| Rank | Win | Risk reduction | Effort | Cost impact |
|---|---|---|---|---|
| 1 | **Wire the declarative runner to a REAL judge call instead of the stub** (F3) — replace `judge: async ({prompt}) => ({score: 0.5, …})` with a real `@cursor/sdk` invocation against `judgeModel` | Eliminates "every case passes by construction" failure mode — the single most dangerous current quality risk | M — add SDK invocation + handle errors / threshold | HIGH — adds 1 LLM call per case using `llmJudge` grader. Mitigate by only enabling when the analyser categorised at least one assertion as `semantic`. |
| 2 | **Populate `graders[]` in stamped declarative cases** (F2) — emit typed graders from the analyser's per-assertion classification (Win #3 of cost wins) | Eliminates the "no graders → automatic pass" failure mode | M — analyser prompt + stamping logic | LOW for regex graders (free), HIGH for llm-judge graders — manage via classification |
| 3 | **Add 1-2 retries with exponential backoff in both runners** (F10) — wrap `agent.send` + `run.wait()` | Eliminates transient-network false failures (~2-5% of cases in real-world testing per typical LLM SDK rates) | M — wrap callback + circuit breaker | LOW — only fires on errors |
| 4 | **Schema-validate `llmJudge` grader response** (F13) — define a tiny `{score: number ∈ [0,1], detail: string}` schema, AJV-validate, retry on malformed | Catches "judge returned invalid JSON" cases that currently fall through to `verdict: "warn"` (silently passing) | S — small schema file + AJV in `llm-judge.ts.tmpl` | LOW — adds ~50ms parse overhead per case |
| 5 | **Calibrate or document the soft-metric thresholds** (F11) — verbosity>2, confidence<0.4, accuracy<0.5, llmJudge.passThreshold ∈ {0.6, 0.72} — pick principled defaults from a baseline run or document why they were chosen | Reduces "thresholds were guesses" risk; makes judge findings more credible | M — requires a calibration run (manually OR a one-time judge over historical `_runs/` data) | NONE — pure analysis on existing artefacts |

---

## 10. Cross-Reference Index

| Finding | Code citation(s) |
|---|---|
| F1 (subagent opus pinning) | `3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` plus 7 siblings; `174:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md` |
| F2 (empty graders in stamped cases) | `37:37,67:67:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/agent-evals/evals.json.tmpl`; `187:198:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |
| F3 (stub judge in declarative runner) | `192:198:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |
| F4 (sequential declarative runner) | `360:363:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |
| F5 (large analyser system prompt) | `1:58:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` |
| F6 (cache scope = analyser only) | `80:80:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md` |
| F7 (maxCallsPerInvocation) | `91:96:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json` |
| F8 (code-strategy doubles per-case cost) | `242:309:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` |
| F9 (inconsistent llmJudge threshold) | `22:22:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/graders/llm-judge.ts.tmpl`; `302:302:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` |
| F10 (no retries) | `153:184:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`; `241:277:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` |
| F11 (arbitrary thresholds) | `27:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md` |
| F12 (host repo manifest gap) | `289:289:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md`; `484:485:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl` |
| F13 (judge output unvalidated) | `34:48:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/graders/llm-judge.ts.tmpl` |
| F14 (README precedence misleading) | `174:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md` |
| F15 (eval:judge alias is smoke) | `12:12:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/package-scripts/base.json`; `271:280:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` |

---

## Appendix — Sampled vs Unsampled Files

To respect the context-frugality directive, I sampled one representative file per LLM path:

| Path | Sampled file | Skipped (and why) |
|---|---|---|
| Analyser system | `agents/zoto-eval-analyser-subagent.md` | Other 7 subagent bodies — already counted via grep for `model:` line |
| Declarative runner | `templates/llm/agent-sdk/runner.ts.tmpl` | `case.ts.tmpl`, `metrics.ts.tmpl`, `writer.ts.tmpl` — not on the hot-path for token cost |
| Code-strategy harness | `templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` | `per-primitive-test.ts.tmpl` (sampled too — small), other `_shared/*` modules |
| Judge | `agents/zoto-eval-judge.md` + `skills/zoto-judge-evals/SKILL.md` (via subtask 01 inventory) | Full judge implementation — lives outside the template tree |
| Cache + drift | `update.ts.tmpl` + `zoto-update-evals/SKILL.md` | `_user-case-guards.ts` (out of scope — not LLM cost) |
| Schemas | `config.schema.json` + `analyser-payload.schema.json` (size only) | The 5 other schemas — not LLM cost |

Every quantitative claim either cites a specific code line, a documented default in `config.schema.json`, or an explicitly-stated order-of-magnitude assumption.
