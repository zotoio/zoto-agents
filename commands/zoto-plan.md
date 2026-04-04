# zoto-plan

Generate structured engineering plans for complex features and multi-step initiatives.

## Usage

```
/zoto-plan                           - Start interactive planning (guided questions)
/zoto-plan @docs/design.md           - Plan implementation from a design doc
/zoto-plan "add feature X"           - Plan a feature by description
```

## Instructions

When this command is invoked, spawn a `zoto-spec-planner` subagent to create an engineering plan. The planner uses the `zoto-create-plan` skill to guide the workflow. Pass `$ARGUMENTS` through to the spawned agent.

### Argument handling

- **No arguments**: Start the guided planning workflow — the planner asks clarifying questions to understand scope before creating a plan
- **File reference(s)**: The planner reads the referenced file(s) as design docs or specs and uses them as the basis for the plan. It may still ask clarifying questions
- **Text description**: The planner uses the description as the feature scope. Pass `$ARGUMENTS` as provided

### What happens

1. Gather requirements (questions or from the referenced doc)
2. Explore the codebase to understand existing patterns and potential conflicts
3. Propose key decisions for user confirmation
4. Create plan files in `{plansDir}/[yyyymmdd]-[feature-name]/` (for example `plans/20260403-feature-name/` when `plansDir` is `plans`):
   - `plan-[feature-name]-[yyyymmdd].md` — coordination index with dependency graph, phases, and definition of done
   - `subtask-NN-[feature]-[name]-[yyyymmdd].md` — one per subtask with objectives, deliverables, and agent assignments
5. Present the plan summary for user review
6. Set plan status to **Ready for Review**

### After planning

- Run `/zoto-judge` to get an independent assessment of the plan's quality and feasibility
- Run `/zoto-execute` to begin guided execution of the plan

## Plan output structure

```
{plansDir}/
└── 20260403-feature-name/
    ├── plan-feature-name-20260403.md
    ├── subtask-01-feature-name-foundation-20260403.md
    ├── subtask-02-feature-name-...
    └── ...
```

Resolve `{plansDir}` from the plugin configuration (default: `plans`).

## Related

- `zoto-spec-planner` agent — specialist that creates and manages plans
- `zoto-create-plan` skill — guided planning workflow
- `/zoto-judge` — assess a plan before execution
- `/zoto-execute` — execute a plan with guided coordination
