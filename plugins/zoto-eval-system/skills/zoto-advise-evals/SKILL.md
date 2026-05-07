---
name: zoto-advise-evals
description: "Coverage gap analyser for eval suites. Scans the codebase across five dimensions — trigger-phrase coverage, schema validation, regression baselines, context citation verification, and status checklist completeness — and produces a structured adviser_report with per-target, per-dimension findings and deterministic recommendations. Read-only: never modifies files. Does not call askQuestion — uses needs_user_input at two breakpoints (summary drill-down and action recommendations) for the command to drive via askQuestion and resume."
---

# Advise Evals

Eval suite coverage critic. Where the judge assesses the *quality of a completed run*, the adviser assesses the *breadth and depth of the eval suite itself* — answering "what tests are missing?" rather than "how did the last run perform?"

The adviser reads source definitions (SKILL.md, agent/command frontmatter) and eval files (evals.json) but **never reads run artefacts** (`_runs/`, `llm.yml`, `static.yml`). It **never modifies** any file. These boundaries keep it complementary to the judge and non-overlapping with `/z-eval-create` and `/z-eval-update`.

## Configuration

Reads `.zoto/eval-system/config.yml`. Uses:

- `evalsDir` — root directory for eval files (default `evals`).
- `discoveryTargets` — which primitive types to scan (skills, commands, agents, hooks).
- `skillsRoots` — directories to walk for skill definitions.
- `ignore` — glob patterns to exclude from discovery.

Also reads `.zoto/eval-system/manifest.yml` for the current target inventory, eval file paths, and content hashes. If the manifest is missing, the skill aborts with `needs_user_input` pointing the user to `/z-eval-create`.

## File Layout / Reads

| File | Purpose |
|------|---------|
| `.zoto/eval-system/config.yml` | Discovery config, ignore globs |
| `.zoto/eval-system/manifest.yml` | Target list, eval file paths, content hashes |
| `plugins/*/skills/*/SKILL.md` | Trigger phrases, citation requirements, "When to Use" sections |
| `plugins/*/skills/*/evals/evals.json` | Existing eval cases and assertions |
| `plugins/*/commands/*.md` | Output contracts for schema validation |
| `plugins/*/agents/*.md` | Output contracts, `needs_user_input` shapes, citation requirements |
| `plugins/*/hooks/*.ts` / `*.mjs` | Hook definitions for checklist/status behaviour |

**Never reads**: `_runs/`, `llm.yml`, `static.yml`, `report.yml`, per-case logs. Those are the judge's domain.

## When to Use

- `/z-eval-advise` invoked.
- User asks "what eval coverage am I missing?" or "are my evals sufficient?"
- After initial `/z-eval-create` to validate the generated suite's completeness.
- Before a release to check for coverage regressions in the eval suite itself.

## Workflow

### Step 1: Load configuration and manifest

Read `.zoto/eval-system/config.yml` and `.zoto/eval-system/manifest.yml`.

If the config file is missing, return:

```yaml
needs_user_input:
  reason: "No eval-system config found."
  questions:
    - id: no-config
      prompt: "Run /z-eval-configure to set up the eval system first."
      options:
        - id: configure
          label: "Run /z-eval-configure now"
```

If the manifest is missing, return:

```yaml
needs_user_input:
  reason: "No manifest found — eval suite has not been scaffolded."
  questions:
    - id: no-manifest
      prompt: "Run /z-eval-create to scaffold the eval suite first."
      options:
        - id: create
          label: "Run /z-eval-create now"
```

Record the scope from the command's pre-collected input:

- `mode: full` — scan all targets in the manifest.
- `mode: targeted` with `target_glob` — filter targets by glob match against `target.path` or `target.id`.

### Step 2: Discover and load source definitions

For each target in scope:

1. Load the target's source definition file (SKILL.md, agent `.md`, command `.md`, hook `.ts`/`.mjs`).
2. Load the target's eval files (`evals/evals.json`) if they exist.
3. Build a target inventory with: `target_id`, `target_path`, `target_type` (skill/command/agent/hook), `has_eval_files`, `eval_cases[]`, `source_definition` (parsed frontmatter + body sections).

### Step 3: Assess coverage across five dimensions

Score every in-scope target against each of the five gap dimensions. Targets not applicable to a dimension are marked **exempt** and excluded from scoring.

#### Dimension 1: Trigger-Phrase Coverage

Applies to: **skills** (targets with a SKILL.md).

1. Extract trigger phrases from the skill's `description` frontmatter and any "When to Use" / "Use when" section. Trigger phrases are action verbs, domain nouns, and recognisable patterns that should route a user's request to this skill.
2. Load the skill's `evals/evals.json` and examine each case's `prompt` field.
3. A trigger phrase is **covered** if at least one eval case's prompt contains it (case-insensitive substring match).
4. A trigger phrase is **uncovered** if no eval case exercises it.

Scoring:

| Coverage % | Severity |
|------------|----------|
| 80–100% | `ok` |
| 50–79% | `warn` |
| 0–49% | `critical` |

Per-target score: `covered_phrases / total_phrases × 100`.

#### Dimension 2: Schema Validation Coverage

Applies to: **commands** and **agents**.

1. Identify the target's expected output contract from its frontmatter `description` and body sections ("What happens", structural promises like "writes config.yml", "appends judge: block", "produces manifest.yml").
2. Load the target's eval cases and scan `assertions[]` for structural keywords: "exists", "contains key", "validates against", "has field", "YAML", "JSON", "schema", "block", "section".
3. A structural contract is **covered** if at least one assertion checks it.
4. A structural contract is **uncovered** if no assertion validates the output shape.

Scoring:

| Coverage % | Severity |
|------------|----------|
| 80–100% | `ok` |
| 50–79% | `warn` |
| 0–49% | `critical` |

Per-target score: `structural_assertions / identified_contracts × 100`.

#### Dimension 3: Regression Baseline Coverage

Applies to: **all targets with eval files**.

1. Load all eval cases from `evals.json`.
2. Classify each case's assertions by grader strength:
   - **Strong**: `llm-judge` with a rubric, `regex` with a pattern, `tool-called` with a specific tool name.
   - **Moderate**: `contains` with strings >= 4 characters.
   - **Weak**: `contains` with strings < 4 characters, vague assertions.
3. Score the target's grader mix:

| Condition | Severity | Score |
|-----------|----------|-------|
| >= 1 `llm-judge` + >= 1 `regex`/`tool-called` | `ok` | strong |
| >= 1 `regex`/`tool-called` but no `llm-judge` | `warn` | partial |
| Only `contains` graders (any length) | `critical` | none |

Per-target score: qualitative (strong=100 / partial=50 / none=0).

#### Dimension 4: Context Citation Verification

Applies to: **agents and skills with citation requirements** (targets whose definitions mention `start:end:path`, "code reference", "citation", "cite"). Targets without citation requirements are **exempt**.

1. Scan the target definition for citation-related keywords.
2. If citation requirements exist, check eval cases for:
   - Assertions mentioning "cite", "citation", "reference", "`start:end:path`".
   - `regex` graders matching the `\d+:\d+:.+` pattern.
3. A citation-producing target is **covered** if at least one assertion validates citation format.
4. A citation-producing target is **uncovered** if no assertion checks citations.

Scoring:

| Coverage % | Severity |
|------------|----------|
| 100% | `ok` |
| 50–99% | `warn` |
| 0–49% | `critical` |

Per-target score: binary (covered=100 / uncovered=0).

#### Dimension 5: Status Checklist Completeness

Applies to: **spec-execution targets** (agents/skills with "spec" in their id or path, especially `zoto-execute-spec`, `zoto-spec-executor`). All other targets are **exempt**.

1. Scan definitions for checklist-related behaviour: "Deliverables Checklist", "Definition of Done", "tick completed", "[x]", "status tracking".
2. Check eval cases for assertions about checklist completion state.
3. A checklist-producing target is **covered** if assertions verify completion state.

Scoring:

| Coverage % | Severity |
|------------|----------|
| 100% | `ok` |
| 50–99% | `warn` |
| 0–49% | `critical` |

Per-target score: binary (covered=100 / uncovered=0).

### Step 4: Produce the adviser report

Build the structured `adviser_report`:

```yaml
adviser_report:
  version: 1
  analysed_at: <ISO 8601>
  scope:
    mode: full | targeted
    target_glob: <string | null>
    config_path: .zoto/eval-system/config.yml
    manifest_path: .zoto/eval-system/manifest.yml

  summary:
    targets_scanned: <int>
    targets_with_gaps: <int>
    aggregate_severity: ok | warn | critical
    dimensions:
      trigger_phrases:
        severity: ok | warn | critical
        score: <0-100>
      schema_validation:
        severity: ok | warn | critical
        score: <0-100>
      regression_baselines:
        severity: ok | warn | critical
        score: <0-100>
      citation_verification:
        severity: ok | warn | critical
        score: <0-100>
      checklist_completeness:
        severity: ok | warn | critical
        score: <0-100>

  dimensions:
    - id: trigger_phrases
      label: "Trigger-Phrase Coverage"
      severity: <ok | warn | critical>
      score: <0-100>
      targets_scanned: <int>
      targets_exempt: <int>
      targets_covered: <int>
      targets_gapped: <int>
      findings:
        - target_id: <manifest target id>
          target_path: <path>
          severity: <ok | warn | critical>
          score: <0-100>
          detail: <string>
          covered_phrases: [{ phrase, eval_case_id }]
          uncovered_phrases: [{ phrase, source }]

    - id: schema_validation
      label: "Schema Validation Coverage"
      # ... same shape; findings include covered_contracts / uncovered_contracts

    - id: regression_baselines
      label: "Regression Baseline Coverage"
      # ... same shape; findings include grader_breakdown

    - id: citation_verification
      label: "Context Citation Verification"
      # ... same shape; findings include citation_requirement_source, has_citation_assertion

    - id: checklist_completeness
      label: "Status Checklist Completeness"
      # ... same shape; findings include checklist_requirement_source, has_checklist_assertion

  recommendations:
    - id: <slug>
      dimension: <dimension-id>
      target_id: <manifest target id>
      severity: warn | critical
      action: create | update
      description: <human-readable recommendation>
      handoff:
        command: /z-eval-create | /z-eval-update
        args:
          target: <glob or target path>
          mode: <create-specific or update-specific flags>
```

The `aggregate_severity` is the **worst severity across all non-exempt dimensions** (`critical > warn > ok`).

### Step 5: Return summary with needs_user_input (Breakpoint 1)

Present a human-readable summary of the scan results and return the first breakpoint:

```yaml
needs_user_input:
  reason: "Gap scan complete. Which dimensions should I analyse in detail?"
  questions:
    - id: drill-down
      prompt: |
        Coverage scan across <N> targets found gaps in <M> of 5 dimensions.

        <per-dimension one-liner with severity and count of gapped targets>
      options:
        - id: <dimension-id>
          label: "<dimension label> (<N> targets with <severity> gaps)"
        # one option per dimension that has gaps
        - id: all
          label: "All dimensions with gaps"
        - id: done
          label: "No drill-down — show recommendations now"
      allow_multiple: true
```

The full `adviser_report` is attached alongside the `needs_user_input` block so the command can reference it if the user wants raw data.

### Step 6: Deepen analysis on selected dimensions (after resume)

When the command resumes with the user's drill-down selections:

1. For each selected dimension, expand the findings with per-target detail: exact uncovered phrases, missing contracts, weak grader specifics, citation gaps.
2. Generate deterministic recommendations. Each gap maps to exactly one action:

| Gap Type | Handoff Command |
|----------|-----------------|
| Target has no eval files at all | `/z-eval-create` with the target in the approved list |
| Eval cases exist but miss trigger phrases | `/z-eval-update --target <path> --apply` |
| Eval cases exist but lack schema/citation/checklist assertions | `/z-eval-update --target <path> --apply` |
| Eval cases exist but use only weak graders | `/z-eval-update --target <path> --apply` |

Decision rules:

```
IF target has no eval_files in manifest:
    → /z-eval-create (target needs initial scaffolding)

ELSE IF target has eval_files but cases need NEW coverage:
    → /z-eval-update --target <target.path> --apply

ELSE IF target has eval_files but existing cases have weak graders:
    → /z-eval-update --target <target.path> --apply
```

### Step 7: Return recommendations with needs_user_input (Breakpoint 2)

Present the actionable recommendations and return the second breakpoint:

```yaml
needs_user_input:
  reason: "Detailed analysis complete. How should I proceed with recommendations?"
  questions:
    - id: action
      prompt: |
        I recommend <N> actions:
        <numbered list of recommendations with target, dimension, and action>
      options:
        - id: accept-all
          label: "Accept all — hand off to /z-eval-create and /z-eval-update"
        - id: walk
          label: "Walk each recommendation individually"
        - id: create-only
          label: "Only hand off new coverage to /z-eval-create"
        - id: update-only
          label: "Only hand off strengthening to /z-eval-update"
        - id: none
          label: "No action — report only"
```

When the user selects an action, produce the handoff data for the command layer:

```yaml
adviser_handoff:
  source: /z-eval-advise
  accepted_recommendations:
    - id: <slug>
      target_id: <manifest target id>
      dimension: <dimension-id>
      action: create | update
  create_targets:
    - <target_id>
  update_targets:
    - glob: <target path glob>
      reason: <short description>
```

The **command** executes handoffs — create first (since update requires existing eval files), then update. The skill never invokes other commands.

## Scoring Reference

### Per-Dimension Score Object

```yaml
dimension: <dimension-id>
score: <0-100>
severity: ok | warn | critical
targets_scanned: <int>
targets_exempt: <int>
targets_covered: <int>
targets_gapped: <int>
```

### Severity Thresholds

| Severity | Score Range | Action Urgency |
|----------|-------------|----------------|
| `ok` | 80–100% (or qualitative "strong") | None |
| `warn` | 50–79% (or qualitative "partial") | Recommended |
| `critical` | 0–49% (or qualitative "none") | Strongly recommended |

### Qualitative-to-Quantitative Mapping

For dimensions that score per-target qualitatively (regression baselines, citation, checklist):

| Qualitative | Numeric |
|-------------|---------|
| strong / covered | 100 |
| partial | 50 |
| none / uncovered | 0 |

Dimension-level score = `mean(per_target_numeric_scores)` across non-exempt targets.

## What NOT to Do

- Do **not** modify any files. The adviser is strictly read-only.
- Do **not** read run artefacts (`_runs/`, `llm.yml`, `static.yml`). That is the judge's domain.
- Do **not** re-run eval cases. The adviser analyses the suite structure, not execution results.
- Do **not** generate or write eval cases directly — delegate to `/z-eval-create` or `/z-eval-update` via handoff.
- Do **not** call `askQuestion`. Use `needs_user_input` so the command can prompt and resume.
- Do **not** invent findings. Every gap must trace to a concrete detection criterion from the five dimensions.
- Do **not** average away critical gaps — `aggregate_severity` is always the worst across dimensions.
