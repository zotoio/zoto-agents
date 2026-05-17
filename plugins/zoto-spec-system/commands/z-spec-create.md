---
name: z-spec-create
description: Generate structured engineering specs for complex features and multi-step initiatives.
---

# z-spec-create

Generate structured engineering specs for complex features and multi-step initiatives.

## Usage

```
/z-spec-create                           - Start interactive spec creation (guided questions)
/z-spec-create @docs/design.md           - Create spec from a design doc
/z-spec-create "add feature X"           - Create a spec by description
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/spec-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Spec System is not initialised. Run `/z-spec-init` first to create `.zoto/spec-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Mandatory reasoning model

When spawning `zoto-spec-generator`, pass a **reasoning-class** model on the Task/spawn tool:

1. **`claude-opus-4-7-thinking-xhigh`** (preferred)
2. If that slug is unavailable: **`claude-4.6-opus-high-thinking`**
3. If that slug is unavailable: **`claude-opus-4-6`**

Do **not** use fast or non-reasoning models for spec creation. The agent frontmatter default is aligned to this preference; overrides must stay within this ladder.

### Requirement gate (hard — before any `{specsDir}/` write)

Follow `zoto-create-spec`. **No file or directory may be created under `{specsDir}/`** (including `status/` scaffolding) until **Step 1** of the skill is complete.

**Preferred — host-led Step 1 (interactive):** Before the first `zoto-spec-generator` spawn, use **`askQuestion`** for structured clarifying questions. Minimum counts:

| Invocation | Minimum clarifying prompts (before drafting filenames) |
|------------|----------------------------------------------------------|
| **No arguments** | **3** questions, **one at a time**, up to **10** total unless the user directs you to proceed sooner with explicit assumptions written down |
| **`@` file reference(s)** | **2** scoped questions after you summarise what you read |
| **Quoted description** | **3** questions |

Then spawn `zoto-spec-generator` with `$ARGUMENTS` **and** prepend a gate block to the delegated prompt:

```markdown
REQUIREMENTS_GATE: satisfied

Gathered requirements:
- …
```

**Alternate — generator-led `needs_user_input`:** If you spawn the generator **before** completing Step 1 (discouraged), instruct it to output **only** the skill’s `needs_user_input` fence and perform **zero** `{specsDir}/` writes until you **resume** the same generator with a `USER_ANSWERS:` block (see `zoto-create-spec`).

When this command is invoked and the gate is satisfied (or you are resuming after `needs_user_input`), spawn `zoto-spec-generator` with the reasoning model above. The generator uses the `zoto-create-spec` skill. Pass `$ARGUMENTS` through unless you are appending the gate block and gathered-requirements bullets as specified.

### Argument handling

- **No arguments**: Run **host-led Step 1** (minimum **3** questions), then spawn the generator with `REQUIREMENTS_GATE: satisfied` — do **not** delegate straight to file creation in one hop without clarifiers or an explicit `needs_user_input` cycle.
- **File reference(s)**: Read the referenced file(s); run **host-led Step 1** (minimum **2** questions unless the generator-led alternate applies); then spawn with `$ARGUMENTS` and the gate block.
- **Text description**: Treat the quoted text as scope input; run **host-led Step 1** (minimum **3** questions); then spawn with `$ARGUMENTS` and the gate block.

### What happens

1. Gather requirements (minimum clarifiers per **Requirement gate** above, or `needs_user_input` / resume — never draft filenames before Step 1 completes)
2. Explore the codebase to understand existing patterns and potential conflicts
3. Propose key decisions for user confirmation
4. Create spec files in `{specsDir}/[yyyymmdd]-[feature-name]/` (for example `specs/20260403-feature-name/` when `specsDir` is `specs`):
   - `spec-[feature-name]-[yyyymmdd].md` — coordination index with dependency graph, phases, and definition of done
   - `subtask-NN-[feature]-[name]-[yyyymmdd].md` — one per subtask with objectives, deliverables, and agent assignments
5. Scaffold `{specsDir}/<spec>/status/` with one paired `.status.md` plus `.status.yml` per subtask, populated from each subtask's Deliverables Checklist (via `pnpm run spec-status-roundtrip -- scaffold`).
6. Present the spec summary and use **`askQuestion`** for structured user approval
7. After user approval, automatically spawn a `zoto-spec-judge` agent to assess the spec's quality and feasibility
8. Set spec status to **Ready for Review**

## Spec output structure

```
{specsDir}/
└── 20260403-feature-name/
    ├── spec-feature-name-20260403.md
    ├── subtask-01-feature-name-foundation-20260403.md
    ├── subtask-02-feature-name-...
    ├── status/
    │   ├── subtask-01-....status.md
    │   └── subtask-01-....status.yml
    └── ...
```

Resolve `{specsDir}` from the plugin configuration (default: `specs`).

## Related

- `zoto-spec-generator` agent — specialist that creates and manages specs
- `zoto-spec-judge` agent — independent quality gate and adversarial verifier
- `zoto-create-spec` skill — guided spec creation workflow
- `/z-spec-execute` — execute a spec with guided coordination
- `/z-spec-judge` — assess a spec before execution
