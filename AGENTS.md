<CRUX agents="always">

## CRITICAL: CRUX Notation

This repository uses CRUX notation for semantic compression. **If not already loaded into context, load `CRUX.md` from the project root** to understand the encoding symbols and decompress any CRUX-formatted content you encounter.

**Repository**: [github.com/zotoio/CRUX-Compress](https://github.com/zotoio/CRUX-Compress)

### Foundational CRUX Rules (MUST FOLLOW)

1. **ALWAYS INTERPRET AND UNDERSTAND ALL CRUX RULES FIRST** - At the beginning of each agent session, interpret and understand all crux notation detected in rules, and when a new rule(s) is added to context do the same for the new rule(s) immediately. Build a mental model of all rules in context that the user can ask for at any point in time that will include a visualisation.
2. **NEVER EDIT `CRUX.md`** - The specification is read-only unless the user specifically asks you by name to edit it, at which point ask the user to confirm before proceeding
3. **DO NOT LOAD SOURCE FILES when CRUX exists** - When you see `⟦CRUX:source_file ... ⟧`, use the compressed CRUX content instead of loading the original source file. The CRUX version is semantically equivalent and more token-efficient.
4. **SURGICAL DIFF UPDATES** - When updating a source file that has a corresponding `[filename].crux.`* file, you MUST also update the CRUX file with surgical diff changes to maintain synchronization.
5. **ABORT IF NO SIGNIFICANT REDUCTION** - If CRUX compression does not achieve significant token reduction (target ≤20% of original), DO NOT generate the CRUX file. The source is already compact enough.
6. **PRESERVE LITERAL PATHS** - When constructing paths, URIs, or tool calls from CRUX references, preserve the literal path, filename, and extension exactly as they exist in the repository.
7. **NEVER EDIT GENERATED CRUX OUTPUT** - Do not edit `.crux.md` or `.crux.mdc` files directly, and do not edit files marked with generated frontmatter (`generated:` plus `sourceChecksum:` or `sourceUrl:`) or the banner `> [!IMPORTANT] > Generated file - do not edit!`
8. **EDIT THE REAL SOURCE FILE** - Move edits to the underlying source file, then re-generate the derived CRUX output. For example, `[name].crux.md` / `[name].crux.mdc` should be changed by editing the real source such as `[name].md`. `AGENTS.md` itself is a source file in this repository; do not invent `AGENTS.source.md`.

### Available Agents

| Agent | Definition | Purpose | Status |
|-------|-----------|---------|--------|
| `crux-cursor-rule-manager` | `.cursor/agents/crux-cursor-rule-manager.md` | CRUX compression, decompression, and validation | Available |
| `crux-cursor-memory-manager` | `.cursor/agents/crux-cursor-memory-manager.md` | Memory lifecycle management (dream, REM sleep, Recall, Forget, Remember, Meditate) | Available |
| `zoto-plugin-manager` | `.cursor/agents/zoto-plugin-manager.md` | Cursor plugin creation, audit, marketplace publishing, validation pipeline, monorepo conventions | Available |
| `zoto-eval-architect` | `.cursor/agents/zoto-eval-architect.md` | Eval-system architecture, ergonomics, token/quality performance, strategy-deprecation analysis, eval-strategy design | Available |
| `zoto-eval-engineer` | `.cursor/agents/zoto-eval-engineer.md` | Eval-system code review, 7 JSON schemas, hard-coded contracts (`preserveUserAuthoredCases`, `writeMetaMarker`), drift detection, repo application audit | Available |
| `integrity-expert` | `.cursor/agents/integrity-expert.md` | Code quality audits, test coverage, security, CI/CD | **Planned** (definition not yet authored) |
| `docs-sync-agent` | `.cursor/agents/docs-sync-agent.md` | Documentation synchronization on source changes | **Planned** (definition not yet authored) |
| `crux-platform-architect` | `.cursor/agents/crux-platform-architect.md` | Platform architecture, Cursor/LLM harness design, documentation, and eval strategy | **Planned** (definition not yet authored) |
| `crux-software-engineer` | `.cursor/agents/crux-software-engineer.md` | Core implementation — Python, shell, MCP server, hooks, skills, and evals | **Planned** (definition not yet authored) |

**Important**: rows marked **Planned** are referenced by older specs and conventions but do not yet have a corresponding definition file. The spec executor will not be able to spawn them as subagents until the file is created. Specs targeting eval-system review/work should prefer `zoto-eval-architect` and `zoto-eval-engineer`; other plugin/monorepo work should prefer `zoto-plugin-manager`. Treat **Planned** rows as roadmap, not as available subagent types.

### User Input Escalation — Subagent Protocol

Subagents NEVER call `AskQuestion` directly. All user-facing prompts must be handled by the **parent agent** (the top-level agent that the user interacts with).

**Two supported patterns** — choose the one that fits the workflow:

#### Pattern A: Pre-collect then spawn

Use when all user choices are known before the subagent starts (e.g. memory type, tags).

1. Parent uses `AskQuestion` to collect all answers
2. Parent spawns subagent with pre-collected answers in the task prompt
3. Subagent executes using the provided answers without asking again

#### Pattern B: Work first, then escalate

Use when the subagent must do analysis, search, or computation before it can formulate the right questions (e.g. resolve memory matches before asking which to delete, analyse artifacts before presenting candidates).

1. Parent spawns subagent (foreground recommended for complex workflows)
2. Subagent does its work (search, analysis, extraction, etc.)
3. Subagent returns results **plus** a `needs_user_input` section describing the decisions needed
4. Parent displays the subagent's analysis to the user
5. Parent uses `AskQuestion` to collect the user's decisions
6. Parent resumes the subagent with the collected answers
7. Subagent applies the confirmed decisions

**Mixing patterns is fine.** A command can pre-collect simple choices (Pattern A) while using Pattern B for decisions that depend on subagent analysis. For example, `/crux-remember` pre-collects type and tags, but if the subagent discovers a conflict with an existing memory, it escalates that decision via Pattern B.

Commands that invoke subagents (e.g. `/crux-dream`, `/crux-remember`, `/crux-forget`, `/crux-recall`, `/crux-meditate`) document which pattern applies to each interaction point.

### Spec Execution — Agent Allocation

When building or executing engineering specs in this repository, **prefer the dedicated specialist agents** over `generalPurpose`. Assign subtasks based on their nature. Only **Available** agents (see status column above) can actually be spawned; **Planned** entries are documented for forward-compatibility.

| Subtask Type | Assign To | Status |
|-------------|-----------|--------|
| Eval-system architecture, ergonomics, token/quality performance, strategy design | `zoto-eval-architect` | Available |
| Eval-system code review, schema/contract consistency, drift detection, repo application audit | `zoto-eval-engineer` | Available |
| Plugin creation, audit, marketplace publishing, validation, monorepo conventions | `zoto-plugin-manager` | Available |
| CRUX compression or decompression tasks | `crux-cursor-rule-manager` | Available |
| Memory lifecycle operations (dream, REM, recall) | `crux-cursor-memory-manager` | Available |
| Plugin-meta documentation (README, CHANGELOG, marketplace.json) | `zoto-plugin-manager` | Available |
| General architecture, design, trade-off analysis (non-eval-system) | `crux-platform-architect` | **Planned** — fall back to `zoto-plugin-manager` if work overlaps plugin meta |
| Documentation updates (README, AGENTS.md, CONTRIBUTORS) (non-plugin-meta) | `crux-platform-architect` | **Planned** |
| Code implementation (Python, shell, MCP, hooks, skills) (non-eval-system) | `crux-software-engineer` | **Planned** |
| Bug fixes, refactoring (non-eval-system) | `crux-software-engineer` | **Planned** |
| Writing evals and tests (non-eval-system) | `crux-software-engineer` | **Planned** |
| Code quality audits, security reviews, CI/CD checks | `integrity-expert` | **Planned** — fall back to `zoto-plugin-manager` for plugin-readiness work |
| Documentation sync after source changes | `docs-sync-agent` | **Planned** |

**Do not default to `generalPurpose`** — every subtask in a spec should map to the most appropriate available specialist agent. When the ideal agent is **Planned** but not yet authored, prefer the closest **Available** agent and explicitly note the fallback in the spec's Key Decisions, rather than silently routing to `generalPurpose`.

### Eval Strategy for Agents

This repository uses the **`code`** LLM eval strategy (`llm.strategy: code` in `.zoto/eval-system/config.yml`). When writing or running LLM evals, use `pnpm run eval:llm:code` (Vitest). The full dual-strategy reference — including when to prefer declarative JSON vs code-based tests — lives in [`plugins/zoto-eval-system/README.md`](plugins/zoto-eval-system/README.md#llm-eval-strategies-declarative--code).

### Live Status During Spec Execution

- During **`/z-spec-execute`**, every spawned subagent owns its **`{specsDir}/<spec>/status/subtask-NN-....status.{md,yml}`** pair. The executor's aggregator rebuilds the spec-root **`status.{md,yml}`** on every change. Read these files before asking about progress.
- Token budgets for spec-system subagents live in **`.zoto/spec-system/config.yml`** under **`subagents.*.tokenBudget`** and reload on the next spawn — no executor restart required. **Token budget changes apply to the next spawned subagent without restarting the executor.**
- Plugin workspace-local config lives under **`.zoto/<plugin-suffix>/`** per [`.cursor/rules/zoto-plugin-conventions.mdc`](.cursor/rules/zoto-plugin-conventions.mdc). The spec-system uses **`.zoto/spec-system/`**.
