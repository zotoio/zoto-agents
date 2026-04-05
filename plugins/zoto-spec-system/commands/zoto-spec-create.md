---
name: zoto-spec-create
description: Generate structured engineering specs for complex features and multi-step initiatives.
---

# zoto-spec-create

Generate structured engineering specs for complex features and multi-step initiatives.

## Usage

```
/zoto-spec-create                           - Start interactive spec creation (guided questions)
/zoto-spec-create @docs/design.md           - Create spec from a design doc
/zoto-spec-create "add feature X"           - Create a spec by description
```

## Instructions

When this command is invoked, spawn a `zoto-spec-generator` subagent to create an engineering spec. The generator uses the `zoto-create-spec` skill to guide the workflow. Pass `$ARGUMENTS` through to the spawned agent.

### Argument handling

- **No arguments**: Start the guided spec creation workflow — the generator asks clarifying questions to understand scope before creating a spec
- **File reference(s)**: The generator reads the referenced file(s) as design docs or requirements and uses them as the basis for the spec. It may still ask clarifying questions
- **Text description**: The generator uses the description as the feature scope. Pass `$ARGUMENTS` as provided

### What happens

1. Gather requirements (questions or from the referenced doc)
2. Explore the codebase to understand existing patterns and potential conflicts
3. Propose key decisions for user confirmation
4. Create spec files in `{specsDir}/[yyyymmdd]-[feature-name]/` (for example `specs/20260403-feature-name/` when `specsDir` is `specs`):
   - `spec-[feature-name]-[yyyymmdd].md` — coordination index with dependency graph, phases, and definition of done
   - `subtask-NN-[feature]-[name]-[yyyymmdd].md` — one per subtask with objectives, deliverables, and agent assignments
5. Present the spec summary for user review
6. After user approval, automatically spawn a `zoto-spec-judge` agent to assess the spec's quality and feasibility
7. Set spec status to **Ready for Review**

## Spec output structure

```
{specsDir}/
└── 20260403-feature-name/
    ├── spec-feature-name-20260403.md
    ├── subtask-01-feature-name-foundation-20260403.md
    ├── subtask-02-feature-name-...
    └── ...
```

Resolve `{specsDir}` from the plugin configuration (default: `specs`).

## Related

- `zoto-spec-generator` agent — specialist that creates and manages specs
- `zoto-spec-judge` agent — independent quality gate and adversarial verifier
- `zoto-create-spec` skill — guided spec creation workflow
- `/zoto-spec-execute` — execute a spec with guided coordination
- `/zoto-spec-judge` — assess a spec before execution
