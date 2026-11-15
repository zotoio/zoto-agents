# Execution strategies

A spec runs one of two ways:

| Strategy | How it runs | Done when |
|----------|-------------|-----------|
| `phased` (default) | Subtasks run by dependency phase. A phase starts when every subtask in earlier phases is complete; subtasks inside a phase run in parallel up to `spec.parallelLimit`. | Every subtask is completed and verified. |
| `loop` | An agent, or a small swarm, makes a small set of changes. When the agents report ready, an event runs the spec's checks against the build. Anything still failing goes back into the loop. | Every check passes, or a limit stops the loop. |

A spec without an `## Execution Strategy` block is `phased`. Existing specs need no change.

The block is YAML in the spec index, validated by [`templates/schema/execution-strategy.schema.json`](../templates/schema/execution-strategy.schema.json) and linted by `spec-strategy-lint`:

```bash
pnpm --filter @zoto-agents/zoto-spec-system run spec-strategy-lint -- --spec-dir specs/<yyyymmdd>-<feature> --parallel-limit 4
```

It prints the normalized strategy and findings as JSON and exits `1` on any HIGH finding.

## Choosing a strategy

Use **`phased`** when:

- the work splits into slices with clear file ownership and an order that matters (schema before loader before UI);
- each subtask can be verified on its own;
- you want the most predictable token use: every subtask runs once, plus verification.

Use **`loop`** when:

- the outcome is easy to check but the path is not (make the tests pass, reach parity with a reference, fix every lint finding);
- the work is small enough that a few short iterations beat a full decomposition;
- the acceptance criteria can be written as checks a machine can run or answer.

Do not use `loop` when the checks would be vague ("looks good"), when nothing can run or score them, or when one iteration is already the whole job. A loop without strong checks keeps spending until it hits a limit.

## The loop

```text
            ┌──────────────────────────────────────────────┐
            ▼                                              │ outstanding checks
  work: swarm_size agents take up to batch_size            │
        outstanding items and make a small change set      │
            │                                              │
            ▼  agents report ready (loop.ready event)      │
  check: run every check in `loop.checks` against the build ┤
            │                                              │
            ├── all pass ─────────────▶ completed           │
            ├── a limit is reached ───▶ stopped (stop_reason)
            └── some fail ─────────────────────────────────┘
```

1. **Start.** Every check starts `pending`. The first iteration takes the subtasks in manifest order; dependencies are ordering hints, not phase gates.
2. **Work.** Up to `swarm_size` agents work at once. Each takes outstanding items (failing checks and the criteria they cover), at most `batch_size` per iteration, and owns distinct files. Agents report ready when their change set is in.
3. **Check.** The ready event runs every check, not only the ones worked on, so a regression re-opens its check.
4. **Decide.** All checks pass: `completed` with `stop_reason: all_checks_passed`. Otherwise the failing checks become the next iteration's outstanding items.
5. **Stop.** Before each iteration the executor compares usage with the limits. It stops when `max_loops`, `max_duration_minutes`, `max_cost_usd` or `max_tokens` would be exceeded, and when `max_stalled_loops` consecutive iterations leave the same checks failing. The token and cost check is predictive: if the last iteration's cost would cross the limit, the loop stops instead of starting a run it cannot finish.

The executor writes `loop-status.yml` at the spec root after every iteration (schema: [`loop-status.schema.json`](../templates/schema/loop-status.schema.json)): state, iteration, limits, usage (tokens, US$, minutes), per-check state, and one row per iteration. Subtask status pairs still update as their items pass, so the aggregator, the dependency graph colours and the onStop check work the same way in both strategies.

A stopped loop is not a failure of the spec system: the execution report lists the outstanding checks, the usage, and the stop reason, and adversarial verification still runs on what was built.

## Block reference

```yaml
execution_strategy: loop        # phased (default) | loop
loop:
  max_loops: 6                  # required, 1–50
  max_duration_minutes: 30      # required, wall clock, up to 1440
  max_cost_usd: 1.50            # at least one of max_cost_usd / max_tokens
  max_tokens: 400000            # input + output + cache, every agent and eval turn
  swarm_size: 2                 # default 1, capped by spec.parallelLimit
  batch_size: 3                 # default 3, outstanding items per iteration
  max_stalled_loops: 2          # default 2
  checks:                       # required, at least one
    - id: C01
      covers: [R01, R02, "02"]  # quote bare subtask ids
      kind: test
      run: node --test test/vector.test.mjs
    - id: C02
      covers: ["03.DoD01"]
      kind: jev
      question: Does the history panel list the last 10 calculations, newest first?
      threshold: 0.85
    - id: C03
      covers: [DoD02]
      kind: agent_eval
      eval: criterion
evals: jev                      # or { provider: jev, guard_inputs, score_checks, threshold, model }
agent_sdk:
  version: 0.6.0
  project: agents/loop-checker
  eval_tag: smoke
```

### `covers` references

| Ref | Means |
|-----|-------|
| `R01` | Requirement 1 in `## Requirements` |
| `DoD01` | Item 1 of the spec's `## Definition of Done` |
| `02` | All of subtask 02 |
| `02.D01` | Deliverable 1 of subtask 02 (the status checklist id `D01`) |
| `02.DoD01` | Definition of Done item 1 of subtask 02 (`DoD01`) |

### Check kinds

| Kind | Needs | Passes when |
|------|-------|-------------|
| `review` | — | The adversarial judge (`zoto-spec-judge`, verification mode) finds the covered items met. |
| `static` | `description` naming the inspection | A non-executing inspection passes (syntax, manifest, package contract). |
| `test` | `run` | The command exits 0. |
| `jev` | `question`, `evals.provider: jev` | Jev's probability for "yes" is at least `threshold` (default `evals.threshold`, 0.85). |
| `agent_eval` | `eval`, `agent_sdk` | The Agent SDK eval case passes (`agent-sdk eval --dir <project> <eval>`). |

### Lint rules

| Rule | Severity | Finding |
|------|----------|---------|
| ES000 | HIGH | Block does not parse or does not match the schema |
| ES001 | HIGH | `loop` without `loop:` limits, or without `max_loops` and `max_duration_minutes` |
| ES002 | HIGH | `loop` without `max_cost_usd` or `max_tokens` |
| ES003 | HIGH | `loop` without checks |
| ES004 | HIGH | A check covers a criterion that is not in the spec |
| ES005 | HIGH | A requirement is not covered by any check |
| ES006 | MEDIUM | A subtask Definition of Done item is not covered |
| ES007 | HIGH | A `jev` check without Jev scoring enabled (`evals.provider: jev`, `score_checks` not false), or an `agent_eval` check without `agent_sdk` |
| ES008 | MEDIUM | `swarm_size` above `spec.parallelLimit` |
| ES009 | HIGH | Duplicate check id |
| ES010 | LOW | `loop:` settings on a phased spec (ignored) |
| ES011 | LOW | `agent_sdk` without a version pin |
| ES012 | MEDIUM | A spec Definition of Done item is not covered |
| ES013 | HIGH | `agent_sdk.project` is absolute or contains `..` |

Hosts must treat `run`, `question` and `eval` as spec-authored instructions: run `test` checks only in an environment that may execute the build, and never with credentials the build should not see.

The judge treats HIGH strategy findings like structural findings: they keep the spec below Approve.

## Setting loop limits

Start from what one iteration costs and leave room for a few:

- **`max_loops`**: 3–6 for a small app or a focused fix; 8–12 only when each iteration is small and checks are cheap. More iterations rarely rescue weak checks.
- **`max_duration_minutes`**: about `max_loops × (expected minutes per iteration)`, plus check time.
- **`max_tokens` / `max_cost_usd`**: about `max_loops × tokens per iteration`. Set both when the host bills in money and the model's price can change. Eval turns (`jev`, `agent_eval`) count toward the limits.
- **`swarm_size`**: 1 unless outstanding items touch different files. Two agents on the same file clobber each other.
- **`batch_size`**: keep it small (2–3) so each check run tells you which change fixed or broke what.
- **`max_stalled_loops`**: 2 stops a loop that keeps failing the same checks; raise it only when progress is expected to be slow but steady.

A host may enforce tighter caps than the spec asks for; it never raises them.

## Jev (optional, recommended)

[Jev](https://typesafe.ai) answers typed questions about a state with calibrated probabilities. Enable it with `evals: jev` when a `TYPESAFE_API_KEY` is configured. Hosts call it through `decide` from `@grok/agent-sdk/extensions/jev`.

Recommended uses:

- **`jev` checks**: one yes/no question per check, about one criterion, with the code and test output as state. Phrase the question so "yes" means met and say that missing evidence means no.
- **Input guard** (`guard_inputs: true`): score user-typed criteria, follow-up cards and fix text for prompt injection before any agent sees them, alongside a local heuristic.

Measured against the Jev API with `jev-latest` (5 guard samples, 3 criterion samples, 1 four-item partial build; 45–214 ms per call):

| Use | Result |
|-----|--------|
| Guard, benign feature text (3) | 0.02–0.03 (allowed) |
| Guard, override injection | 0.99 (quarantined; the local heuristic also caught it at 0.94) |
| Guard, subtle exfiltration request | 0.88 (quarantined; the local heuristic scored 0.35 and would have allowed it) |
| Criterion met / not met / no evidence | 0.95 / 0.01 / 0.03 |
| Partial build, one boolean per item | 0.03–0.05 for each unmet item |
| Partial build, one share-of-items `score` question | 0.95 (overstated) |

So: ask one boolean per criterion. Do not use a single "what share is met" score as a loop exit condition, because it overstated a half-finished build.

Without a key, or when a call fails, hosts fall back to deterministic checks and the heuristic guard; `jev` checks then fall back to `review`. Jev calls are billed by TypeSafe and count toward the loop's cost limit when the host reports them.

## Agent SDK (optional, recommended)

Use the [Agent SDK](https://cursor.com/docs/agent-sdk) (`@grok/agent-sdk`, pinned to `0.6.0`, Node ≥ 22.13) when a check needs judgement a command cannot give, but should be a repeatable, versioned eval instead of a free-form review:

1. Create a small project, for example `agents/loop-checker/`, with `bot/agent.ts` (`defineAgent`, no tools or read-only tools, a low-effort model), `bot/instructions.md` (return one JSON verdict), and `evals/evals.config.ts` plus one `*.eval.ts` per check (`defineEval`).
2. Validate it: `agent-sdk validate --dir agents/loop-checker` and `agent-sdk eval --dir agents/loop-checker --list`.
3. Declare it under `agent_sdk:` and reference cases from `agent_eval` checks.

Minimal checker:

```ts
// agents/loop-checker/bot/agent.ts
import { defineAgent, tempFs } from "@grok/agent-sdk";
export default defineAgent({
  name: "loop-checker",
  model: { id: "claude-haiku-5-5", params: [{ id: "reasoning_effort", value: "low" }] },
  tools: [],
  fs: tempFs({}),
  workspace: "/check",
});
```

```ts
// agents/loop-checker/evals/criterion.eval.ts
import { defineEval, matches } from "@grok/agent-sdk/evals";
import { z } from "zod";
export default defineEval({
  tags: ["smoke"],
  async test(t) {
    await t.send("Criterion: …\nCode: …\nTest output: …");
    t.succeeded();
    t.usedNoTools();
    t.check(JSON.parse(t.reply ?? "{}"), matches(z.object({ met: z.literal(true), reason: z.string() })));
  },
});
```

Measured with `@grok/agent-sdk` 0.6.0 on Node 22: `loadProject(dir, { strict: true })` and `agent-sdk validate` pass for file-first projects, `agent-sdk eval --list` discovers cases, and a one-turn `claude-haiku-5-5` (low effort) eval returned the correct verdict for a met and an unmet criterion in 5–6 s each. Notes:

- Model turns need a Cursor credential (`CURSOR_API_KEY`).
- The CLI falls back to the host's `gh auth token` for GitHub access. Run eval checks with a credential-free environment when the build is untrusted.
- Node 20 cannot load the SDK; use Node 22.13 or later.

Prefer `test` or `static` when a command can decide the criterion: they are cheaper and deterministic. Prefer `jev` over `agent_eval` for short yes/no questions; use `agent_eval` when the checker must read several files or produce a structured verdict.

## Examples

### Phased (default, no block)

Leave the block out. The manifest, dependency graph and phases drive execution.

### Loop for a small app with local checks

```yaml
execution_strategy: loop
loop:
  max_loops: 4
  max_duration_minutes: 20
  max_tokens: 300000
  checks:
    - id: C01
      covers: [R01, R02, "01", "02"]
      kind: test
      run: npm test
    - id: C02
      covers: [R03, "03"]
      kind: review
```

### Loop with Jev and an Agent SDK checker

```yaml
execution_strategy: loop
loop:
  max_loops: 6
  max_duration_minutes: 30
  max_cost_usd: 1.00
  max_tokens: 500000
  swarm_size: 2
  checks:
    - id: C01
      covers: [R01, "01"]
      kind: static
      description: Every JavaScript file parses and package.json has start and test scripts
    - id: C02
      covers: [R02, "02.DoD01"]
      kind: jev
      question: Does normalize return [0,0,0] for the zero vector without NaN?
    - id: C03
      covers: [R03, "02", "03"]
      kind: agent_eval
      eval: criterion
evals:
  provider: jev
  guard_inputs: true
agent_sdk:
  version: 0.6.0
  project: agents/loop-checker
```
