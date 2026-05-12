# Context and Cost Optimization Report

## Scope

This report examines the Spec System plugin's runtime context footprint across:

- `agents/*.md`
- `commands/*.md`
- `skills/*/SKILL.md`
- `skills/*/evals/evals.json`

The goal is high end-to-end performance and lower model cost without losing accuracy, adversarial verification quality, or compatibility with existing slash commands and spec files.

Token estimates are approximate and use `characters / 4`, which is adequate for comparing mostly Markdown and JSON files. Actual model tokenization will vary.

## Current footprint

| File | Lines | Bytes | Estimated tokens |
|---|---:|---:|---:|
| `agents/zoto-spec-executor.md` | 249 | 11,262 | 2,796 |
| `agents/zoto-spec-generator.md` | 225 | 9,489 | 2,352 |
| `agents/zoto-spec-judge.md` | 99 | 6,133 | 1,516 |
| `commands/zoto-spec-create.md` | 60 | 2,926 | 720 |
| `commands/zoto-spec-execute.md` | 74 | 5,173 | 1,283 |
| `commands/zoto-spec-judge.md` | 89 | 4,604 | 1,138 |
| `skills/zoto-create-spec/SKILL.md` | 113 | 6,189 | 1,545 |
| `skills/zoto-execute-spec/SKILL.md` | 275 | 14,069 | 3,502 |
| `skills/zoto-judge-spec/SKILL.md` | 272 | 12,073 | 3,006 |
| `skills/zoto-create-spec/evals/evals.json` | 53 | 3,691 | 923 |
| `skills/zoto-execute-spec/evals/evals.json` | 48 | 2,996 | 748 |
| `skills/zoto-judge-spec/evals/evals.json` | 49 | 3,023 | 754 |

| Category | Lines | Bytes | Estimated tokens |
|---|---:|---:|---:|
| Agents | 573 | 26,884 | 6,665 |
| Commands | 223 | 12,703 | 3,141 |
| Skills | 660 | 32,331 | 8,053 |
| Evals | 150 | 9,710 | 2,424 |
| **Total** | **1,606** | **81,628** | **20,283** |

## Runtime stack impact

Most invocations stack multiple artifacts:

| Flow | Likely context stack | Estimated instruction tokens before repo/spec input |
|---|---|---:|
| `/zoto-spec-create` | create command + generator agent + create skill | ~4,617 |
| `/zoto-spec-create` with automatic judge | create stack + judge agent + judge skill | ~9,139 |
| `/zoto-spec-execute` | execute command + executor agent + execute skill | ~7,581 |
| `/zoto-spec-judge` | judge command + judge agent + judge skill | ~5,660 |
| Per-subtask adversarial verification | judge agent only, or judge agent + judge skill if attached by runtime | ~1,516-4,522 each |

The main cost driver is not one large file; it is repeated layered loading plus repeated fresh judge contexts during execution. For an 8-subtask spec, adversarial verification alone can add roughly 12k-36k instruction tokens before any subtask content is considered.

## Per-component findings

### Agents

- `zoto-spec-executor.md` is the largest agent. It repeats directory formats, manifest examples, execution workflow, verification rules, and performance rules that also exist in `zoto-execute-spec`.
- `zoto-spec-generator.md` repeats the spec directory structure, index template, subtask template, operating mode, and creation rules that overlap with `zoto-create-spec`.
- `zoto-spec-judge.md` is leaner but duplicates verdict thresholds and verification principles from `zoto-judge-spec`.

Impact: agent duplication is paid whenever a command spawns a specialist. It is also paid repeatedly for fresh judge contexts.

### Commands

- Commands are currently medium-weight wrappers. `zoto-spec-execute.md` and `zoto-spec-judge.md` restate workflow details and safeguards already owned by their skills and agents.
- `zoto-spec-create.md` is closest to the ideal: usage, routing, and a short summary.

Impact: commands should be cheap routing layers. Every repeated rule here is paid before the actual agent/skill runs.

### Skills

- `zoto-execute-spec` and `zoto-judge-spec` dominate skill tokens. Both include full workflows, detailed templates, verification steps, and report formats.
- `zoto-create-spec` is moderate, but still repeats conventions already present in the generator agent.
- The skill files carry the highest accuracy risk if reduced too aggressively because they define the operational contract.

Impact: skills are the best place to keep authoritative behavior, but they should use progressive disclosure for large templates and examples.

### Evals

- Eval JSON is modest in absolute size but becomes recurring cost if a harness loads all evals or echoes verbose assertions into grading prompts.
- Current evals use `files: []`, so scenario detail lives in prompt/assertion prose rather than compact fixtures.

Impact: eval optimization matters most in CI or repeated plugin validation, less during normal user invocation.

## Options

### Option 1: Thin commands to routing wrappers

Change each command to contain only frontmatter, usage, argument mapping, spawn target, and a short invariant list. Remove detailed workflow and report layout from command docs.

Estimated benefit:

- `zoto-spec-execute.md`: ~45-60% reduction, saving ~575-770 tokens per execute invocation.
- `zoto-spec-judge.md`: ~50-65% reduction, saving ~570-740 tokens per judge invocation.
- `zoto-spec-create.md`: ~25-40% reduction, saving ~180-290 tokens per create invocation.

Pros:

- Low implementation risk.
- Slash command behavior remains unchanged.
- Makes command files easier to scan and maintain.
- Reduces every invocation before any agent work starts.

Cons:

- Users reading command docs directly see less detail.
- If a runtime ever executes a command file without attaching the agent/skill, the command alone becomes under-specified.

Backward compatibility:

- Compatible with existing command names and arguments.
- Keep usage examples and `$ARGUMENTS` pass-through unchanged.
- No spec file migration required.

Rationale:

Commands should route intent, not duplicate the execution manual. Accuracy is preserved if authoritative rules remain in skills and minimal non-negotiable guardrails stay in commands.

### Option 2: Slim agents to identity, config, and hard constraints

Move repeated templates and long workflows out of agents. Keep role identity, model/default config keys, required skill, safety constraints, and mode selection.

Estimated benefit:

- Agents total: ~6,665 tokens.
- Conservative reduction: 30-40%, saving ~2,000-2,700 tokens across all agents.
- Aggressive reduction: 45-55%, saving ~3,000-3,700 tokens across all agents.
- Largest win is executor/generator; judge should remain moderately explicit because it is repeatedly spawned and must stay independent.

Pros:

- Reduces every specialist spawn.
- Lowers repeated judge costs if judge remains focused on verification invariants.
- Clarifies the hierarchy: command routes, agent frames, skill executes.

Cons:

- Higher risk than thinning commands because agents may be launched directly by users or the platform.
- Removing too much from the judge agent can weaken adversarial independence.

Backward compatibility:

- Keep agent names, frontmatter, and descriptions unchanged.
- Preserve `model: composer-2`.
- Retain hard rules in each agent: create never edits code, execute respects dependencies, judge never rubber-stamps.

Rationale:

Agents should frame behavior and delegate to skills. Large examples and duplicated templates belong in one authoritative location.

### Option 3: Move templates and report formats into references

Create one canonical reference file, for example `skills/references/spec-format.md`, with the index template, subtask template, assessment report template, and execution report template. Skills link to it and load only the needed section.

Estimated benefit:

- Skills total: ~8,053 tokens.
- Moving long templates and report layouts could save ~25-40% from skills, roughly ~2,000-3,200 tokens.
- If agents also stop duplicating templates, combined savings can exceed ~4,000 tokens in create/execute flows.

Pros:

- Single source of truth for spec formats.
- Reduces drift between generator, executor, and judge.
- Easier to update report conventions once.

Cons:

- Requires confidence that the runtime can retrieve referenced files when needed.
- If references are not attached during evals, tests may pass locally but real agent behavior may miss formats.
- Extra indirection can slow a human reader.

Backward compatibility:

- Keep output file names and Markdown structures unchanged.
- Move content without changing semantics.
- Add a transition test that verifies skills still mention the reference path and the reference contains required headings.

Rationale:

Large static templates are ideal for progressive disclosure: they are rarely needed in full at every decision point, but must remain available when writing files.

### Option 4: Deduplicate verification instructions

Make `zoto-spec-judge.md` the canonical source for adversarial verification invariants. `zoto-execute-spec` should say when and how to spawn the judge, but avoid repeating every checklist inspection detail.

Estimated benefit:

- Execute skill reduction: ~400-800 tokens.
- Execute command reduction: ~150-250 tokens.
- Judge prompt reduction depends on spawn style; if executor currently embeds repeated verification instructions into every judge prompt, per-subtask savings can be ~300-700 tokens.

Pros:

- Multiplies across every subtask judge spawn.
- Keeps independent verification semantics in the independent judge.
- Reduces contradiction risk between executor and judge.

Cons:

- Executor prompts must still tell the judge which subtask to verify and what result format to return.
- If the judge agent is not loaded in a fresh context, the executor's shorter instruction may be insufficient.

Backward compatibility:

- No change to verification requirement or verdict names.
- Keep `Verified`, `Partial`, and `Failed` statuses unchanged.
- Preserve index status updates in executor skill.

Rationale:

The executor owns scheduling; the judge owns verification. Cost drops when each role carries only its own contract.

### Option 5: Tier and scope eval execution

Run evals by skill directory and use tiers:

- Fast PR tier: schema validation plus one representative eval per skill.
- Full tier: all evals per skill, run on release or nightly.
- Regression tier: targeted evals for changed skill/agent/command files.

Estimated benefit:

- Eval JSON total: ~2,424 tokens before harness overhead.
- If the harness currently loads all evals for every run, per-skill scoping can reduce eval prompt material by ~55-70%.
- Fast PR tier can reduce LLM eval calls by ~60-75% while retaining structural validation.

Pros:

- Direct recurring cost reduction in CI and local validation.
- Faster feedback for plugin edits.
- Lets high-risk changes still opt into the full suite.

Cons:

- Fewer default evals means weaker routine regression coverage.
- Requires harness support for selecting eval IDs or changed directories.
- Historical benchmark comparability changes if prompts/assertions are rewritten.

Backward compatibility:

- Keep existing eval IDs stable.
- Add tiers as harness metadata or scripts rather than deleting cases first.
- If assertions are shortened, preserve their semantic requirements.

Rationale:

Most changes do not affect all skills. Cost should scale with the changed surface area.

### Option 6: Convert verbose eval prose into fixtures

Use `files` fixtures for repeated spec examples and keep prompts/assertions shorter. For example, store a compact sample spec manifest and reference it in evals rather than describing all conditions in prose.

Estimated benefit:

- Eval JSON prompt/assertion text could shrink ~25-45%.
- Grader context can shrink more if fixtures are shared and cached by the harness.

Pros:

- More realistic eval inputs.
- Shorter, more stable prompts.
- Easier to test edge cases like bad dependencies or mismatched metadata.

Cons:

- More files to maintain.
- Harness must load fixtures reliably.
- Fixture path bugs can produce false negatives.

Backward compatibility:

- Keep eval IDs and high-level expected outputs.
- Introduce fixtures additively, one eval suite at a time.

Rationale:

Fixtures turn long natural-language setup into concrete artifacts, improving both accuracy and repeatability.

### Option 7: Add compact mode for low-risk operations

Define a usage pattern where agents ask for or infer a compact mode for low-risk operations:

- Resume status checks.
- Listing existing specs.
- Validating manifest shape.
- Running schema-only eval validation.

Compact mode should not be used for spec generation, code execution, or adversarial verification unless explicitly requested.

Estimated benefit:

- Small direct file-size benefit unless paired with slim command/agent docs.
- High usage-pattern benefit for frequent low-risk operations: ~30-60% fewer instruction tokens in those paths.

Pros:

- Preserves accuracy for high-risk flows.
- Gives users faster status and validation commands.
- Can be implemented as prompt discipline before file rewrites.

Cons:

- Adds mode complexity.
- Incorrect mode selection could under-inform a high-risk operation.

Backward compatibility:

- Additive if default behavior remains full-fidelity.
- Should not change outputs unless compact mode is explicitly selected or clearly safe.

Rationale:

Not every command needs the full orchestration contract. Context should match task risk.

### Option 8: Optional semantic compression for stable references

For stable, repetitive reference material, generate compressed variants using the repository's semantic-compression workflow and keep source Markdown canonical.

Estimated benefit:

- Stable reference text can often compress 5-10x when semantics are well-structured.
- Practical savings depend on whether the runtime loads compressed references instead of source references.

Pros:

- Aligns with repository conventions.
- Strong savings for boilerplate and templates.
- Can preserve semantics when generated and validated properly.

Cons:

- Highest process complexity.
- Generated compression outputs must not be edited directly.
- If compression is too dense, marketplace users unfamiliar with the notation may find docs harder to audit.

Backward compatibility:

- Keep source Markdown as the editable and human-readable contract.
- Only use compressed output where the runtime explicitly supports it.
- Follow generation and checksum rules.

Rationale:

Semantic compression is useful after the source contract is deduplicated. Compressing duplicated prose before deduplication would preserve avoidable waste.

## Recommended roadmap

### Phase 1: Low-risk savings

1. Thin command files.
2. Align filename convention drift in `zoto-create-spec` conventions.
3. Add tests that assert command files route to the correct agent/skill and stay below a target size.

Expected benefit: ~1,300-1,800 tokens saved across command stacks, minimal behavior risk.

### Phase 2: Deduplicate authority

1. Make skills authoritative for workflows.
2. Slim generator/executor agents to role, config, skill use, and non-negotiable rules.
3. Keep judge agent explicit enough for fresh adversarial contexts.

Expected benefit: ~2,000-3,500 tokens saved in normal command stacks, plus repeated judge savings if prompts stop restating verification details.

### Phase 3: Progressive references

1. Add `skills/references/spec-format.md`.
2. Move index, subtask, assessment, and execution report templates into it.
3. Update skills to reference exact sections.
4. Add regression tests verifying reference headings and required file naming patterns.

Expected benefit: ~2,000-3,200 skill tokens, with better consistency.

### Phase 4: Eval cost controls

1. Add per-skill eval selection to validation docs/scripts if supported.
2. Define fast/full/regression tiers.
3. Convert one verbose eval suite to fixtures and compare failure quality before broad rollout.

Expected benefit: ~55-70% less eval prompt material in scoped runs and fewer LLM eval calls in fast paths.

### Phase 5: Optional compression

Only after deduplication, evaluate semantic compression for stable references. Use it where runtime support and maintainability are clear.

## Accuracy guardrails

- Do not remove dependency enforcement, user approval gates, fresh judge verification, or final test/lint requirements.
- Do not make commands so thin that they omit their spawned agent and skill.
- Do not assume referenced files are loaded unless tests or platform behavior prove it.
- Do not shorten eval assertions until each shortened assertion still catches the same failure class.
- Keep public command names, spec directory conventions, report filenames, verdict labels, and status values stable.

## Backwards compatibility summary

| Area | Compatibility stance |
|---|---|
| Slash commands | Preserve names, arguments, and `$ARGUMENTS` forwarding. |
| Agent names | Preserve all `zoto-spec-*` agent names and frontmatter fields. |
| Skill names | Preserve `zoto-create-spec`, `zoto-execute-spec`, and `zoto-judge-spec`. |
| Spec files | Preserve existing directory and Markdown output formats. |
| Reports | Preserve `assessment-*` and `execution-report-*` outputs unless a migration is explicitly planned. |
| Evals | Preserve IDs and semantic assertions; tier execution before deleting coverage. |

## Bottom line

The best cost-performance path is not a single compression pass. It is a hierarchy cleanup:

1. Commands route.
2. Agents frame and enforce hard constraints.
3. Skills own workflows.
4. References own large static templates.
5. Evals run only the coverage required for the changed surface area.

This should reduce normal command instruction context by roughly 25-45% and repeated eval/judge overhead by roughly 40-70% in optimized paths, while preserving accuracy through explicit guardrails and regression tests.
