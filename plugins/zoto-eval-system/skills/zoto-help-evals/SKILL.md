---
name: zoto-help-evals
description: Section-routed help for the Eval System plugin. Loads plugins/zoto-eval-system/README.md and navigates to the requested section via askQuestion. Invoked by the routing rule whenever the user asks how-to questions about configuring, creating, updating, executing, judging, or comparing evals.
---

# Help Evals

Canonical help for the Eval System plugin. This skill loads `README.md` and returns the relevant section, so every how-to answer stays in sync with the shipped docs.

## Configuration

No repo-level config required. The skill uses the plugin's own `README.md` as the source of truth.

## When to Use

- `/zoto-eval-help` invoked.
- The routing rule `rules/zoto-eval-system.mdc` detects help-intent in the user's message and hands off to this skill before the agent answers from inferred knowledge.

## Workflow

### Step 1: Load README

Read `plugins/zoto-eval-system/README.md` (or the installed path at `~/.cursor/plugins/zoto-eval-system/README.md`). Parse section headers (`## Overview`, `## Quick start`, `## Configuration`, etc.).

### Step 2: Select a section

If the user passed `<topic>`, match it case-insensitively against section headers. Resolve ambiguity via `askQuestion`.

If no topic was passed, use `askQuestion` with a numbered list of available sections:

```
Which topic?
  1. Overview
  2. Quick start
  3. Configuration
  4. Static backend (pytest)
  5. LLM backend (@cursor/sdk)
  6. Updating evals when code changes
  7. Result schema
  8. Run logs
  9. Comparing runs
  10. Judge & soft metrics
  11. Manual checklists
  12. CI integration
  13. Troubleshooting
```

### Step 3: Return the section

Print the selected section verbatim. Do not paraphrase — the README is the source of truth.

### Step 4: Offer navigation

After printing, use `askQuestion` to offer:

- Related sections (derived from cross-links inside the section).
- Jump to quick start.
- Exit.

## What NOT to Do

- Do not answer from inferred knowledge. Always load the README.
- Do not rewrite the README — edits go through `/zoto-eval-help` authors committing directly.
- Do not skip askQuestion when the topic is ambiguous or empty.
