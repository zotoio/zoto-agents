# Subtask: Architecture & Gap Taxonomy Design

## Metadata
- **Subtask ID**: 01
- **Feature**: Eval Adviser
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: None
- **Created**: 20260506

## Objective

Design the adviser agent's architecture, define the gap analysis taxonomy with scoring rubric, and specify the interaction model between command, agent, and skill layers. Produce a design document that subtasks 02–06 will reference.

## Deliverables Checklist
- [x] Design document: `specs/20260506-eval-adviser/design-eval-adviser-architecture.md`
- [x] Gap analysis taxonomy defining five dimensions with severity scoring
- [x] Interaction model diagram showing askQuestion/needs_user_input flow across command → agent → skill
- [x] Assessment rubric specifying how each gap dimension is scored (e.g., coverage percentage, severity levels)
- [x] Interface contract: shape of the structured gap report the skill produces
- [x] Handoff protocol: how recommendations map to `/zoto-eval-create` and `/zoto-eval-update` actions

## Definition of Done
- [x] Design document written and internally consistent
- [x] All five gap dimensions have clear detection criteria and scoring rules
- [x] Interaction model follows the hybrid askQuestion contract from `rules/zoto-eval-system.mdc`
- [x] No ambiguity in the handoff protocol — each recommendation type maps to a specific action

## Implementation Notes

### Gap Analysis Dimensions

Define detection criteria and severity scoring for each:

1. **Trigger-phrase coverage** — For each skill, check whether blackbox tests exist that verify the skill activates on expected phrases. Detection: scan `evals/evals.json` for skills, check if prompt fields exercise trigger phrases from `SKILL.md` descriptions. Gap: skills with no trigger-phrase test or only generic prompts.

2. **Schema validation coverage** — For each command/agent, check whether tests validate that outputs conform to expected schemas (YAML structure, required fields, correct types). Detection: scan command/agent evals for assertions about output structure. Gap: commands/agents with no structural assertions.

3. **Regression baseline coverage** — Check whether eval cases produce results that are comparable over time (consistent metrics, deterministic graders). Detection: check for `llm-judge` graders with rubrics, `regex` graders for structural patterns. Gap: cases relying only on weak `contains` graders or missing soft-metric baselines.

4. **Context citation verification** — Check whether agents that should produce `start:end:path` code references have tests asserting citation presence and format. Detection: scan agent/skill descriptions for citation requirements, cross-reference with eval assertions. Gap: citation-producing agents without citation assertions.

5. **Status checklist completeness** — Check whether spec-executing agents have tests verifying that deliverable checklists are fully resolved. Detection: scan for spec-system-related evals checking checklist state. Gap: spec executors without checklist completion assertions.

### Interaction Model

Study and reference these existing patterns:
- `commands/zoto-eval-judge.md` — askQuestion + resume loop pattern
- `commands/zoto-eval-help.md` — multi-turn navigation pattern
- `agents/zoto-eval-judge.md` — needs_user_input pattern
- `rules/zoto-eval-system.mdc` — hybrid askQuestion contract

### Key Files to Study
- `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` — the hybrid askQuestion contract
- `plugins/zoto-eval-system/commands/zoto-eval-judge.md` — resume loop pattern
- `plugins/zoto-eval-system/commands/zoto-eval-help.md` — multi-turn navigation pattern
- `plugins/zoto-eval-system/agents/zoto-eval-judge.md` — needs_user_input pattern
- `plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md` — multi-step analysis pattern

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- This is a design subtask — no code changes, no tests to run
- Validate by reviewing internal consistency of the design document

## Execution Notes

### Agent Session Info
- Agent: crux-platform-architect
- Started: 2026-05-06T21:03:00+10:00
- Completed: 2026-05-06T21:10:00+10:00

### Work Log
1. Read subtask definition and parent spec to understand full requirements.
2. Studied existing patterns in depth: judge agent/command/skill, help command, eval-system rule (hybrid askQuestion contract), manifest schema, config structure, and example eval cases.
3. Designed five gap dimensions with detection criteria, scoring thresholds, and severity classification — each modelled after concrete examples found in the existing manifest and eval files.
4. Created interaction model with mermaid sequence diagram showing the askQuestion/needs_user_input flow across command → agent → skill layers, with two natural breakpoints (drill-down + action selection).
5. Defined the full adviser_report YAML schema with per-dimension findings, per-target detail, and a recommendations array with deterministic handoff mapping.
6. Specified the handoff protocol with decision rules mapping each recommendation type to exactly one of `/zoto-eval-create` or `/zoto-eval-update`.

### Blockers Encountered
None.

### Files Modified
- `specs/20260506-eval-adviser/design-eval-adviser-architecture.md` (created)
- `specs/20260506-eval-adviser/subtask-01-eval-adviser-architecture-design-20260506.md` (updated checklists and execution notes)
